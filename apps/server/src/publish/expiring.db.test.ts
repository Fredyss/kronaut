import type { Keyring } from '@kronaut/credentials';
import type { Actor, Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { HttpClient } from '@kronaut/egress';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadCredential } from '../credential-store.ts';
import { createProviderRegistry, type ProviderRegistry } from '../providers.ts';
import { refreshExpiring } from './refresh.ts';
import { fakeProvider, type PublishFixture, startPublishFixture } from './testing.ts';

const SYSTEM: Actor = { kind: 'system' };
const CLI: Actor = { kind: 'cli' };
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const STATIC = 'fake_static';

let test: TestDatabase;
let fixture: PublishFixture;
let notified: string[];

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startPublishFixture(test, 'ws-expiring');
  const adminId = await fixture.createUser('admin');
  const editorId = await fixture.createUser('editor');
  const restrictedId = await fixture.createUser('restricted-admin');
  await fixture.owner.withActor(CLI, (trx) =>
    trx
      .insertInto('memberships')
      .values([
        { workspace_id: fixture.workspaceId, user_id: adminId, role: 'admin' },
        { workspace_id: fixture.workspaceId, user_id: editorId, role: 'editor' },
        {
          workspace_id: fixture.workspaceId,
          user_id: restrictedId,
          role: 'admin',
          resource_scope: 'restricted',
        },
      ])
      .execute(),
  );
  notified = [fixture.ownerUserId, adminId].sort();
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

beforeEach(async () => {
  await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('social_accounts')
      .set({ status: 'disconnected' })
      .where('workspace_id', '=', fixture.workspaceId)
      .execute(),
  );
});

function inMs(ms: number): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(Date.now() + ms);
}

function incidents(accountId: string) {
  return fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('channel_incidents')
      .select(['id', 'kind', 'occurrences', 'last_seen_at', 'notified_at', 'resolved_at'])
      .where('social_account_id', '=', accountId)
      .orderBy('opened_at')
      .orderBy('id')
      .execute(),
  );
}

function events(accountId: string, type: string) {
  return fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('webhook_events')
      .select(['dedupe_key', 'payload'])
      .where('subject_id', '=', accountId)
      .where('type', '=', type)
      .orderBy('occurred_at')
      .execute(),
  );
}

function notifications(incidentId: string) {
  return fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('notifications')
      .select(['user_id', 'kind', 'payload', 'dedupe_key'])
      .where('incident_id', '=', incidentId)
      .orderBy('user_id')
      .execute(),
  );
}

async function sweep(): Promise<Record<string, number>> {
  return JSON.parse(await refreshExpiring(fixture.deps));
}

function expectedEvent(accountId: string, incidentId: string, expiresAt: Temporal.Instant) {
  return {
    dedupe_key: `channel.expiring.${accountId}.${incidentId}`,
    payload: expect.objectContaining({
      type: 'channel.expiring',
      data: {
        social_account_id: accountId,
        provider: 'fake',
        expires_at: Temporal.Instant.fromEpochMilliseconds(expiresAt.epochMilliseconds).toString(),
      },
    }),
  };
}

function spied(providers?: ProviderRegistry) {
  const opened: number[] = [];
  const leads: number[] = [];
  const keyring: Keyring = {
    current: fixture.keyring.current,
    versions: () => fixture.keyring.versions(),
    key: (version) => {
      opened.push(version);
      return fixture.keyring.key(version);
    },
  };
  const db: Database = {
    ...fixture.db,
    sweeps: {
      ...fixture.db.sweeps,
      expiringCredentials: (withinSeconds, limit) => {
        leads.push(withinSeconds);
        return fixture.db.sweeps.expiringCredentials(withinSeconds, limit);
      },
    },
  };
  const deps = { ...fixture.deps, db, keyring, providers: providers ?? fixture.deps.providers };
  return { deps, opened, leads };
}

function withStatic(warnLeadMs: number): ProviderRegistry {
  const other = fakeProvider();
  other.configureAuth({ refresh: 'none', warnLeadMs });
  return createProviderRegistry(
    [fixture.fake.manifest, { ...other.manifest, id: STATIC }],
    [fixture.fake.runtime, { ...other.runtime, id: STATIC }],
    () => ({}) as HttpClient,
  );
}

describe('channel.expiring', () => {
  it('warns once for a credential that cannot be refreshed, then skips it without decrypting', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'none', warnLeadMs: 3 * DAY_MS });
    const expiresAt = inMs(2 * DAY_MS);
    const accountId = await fixture.connectAccount(fixture.appId, { accessExpiresAt: expiresAt });
    const calls = fake.refreshes.length;

    expect(await sweep()).toMatchObject({ due: 0, expiring: 1 });

    const [incident, ...rest] = await incidents(accountId);
    if (incident === undefined) throw new Error('no incident');
    expect(rest).toEqual([]);
    expect(incident).toMatchObject({ kind: 'auth_expiring', occurrences: 1, resolved_at: null });
    expect(incident.notified_at).not.toBeNull();
    expect(await events(accountId, 'channel.expiring')).toEqual([
      expectedEvent(accountId, incident.id, expiresAt),
    ]);
    const dedupeKey = `channel.expiring.${accountId}.${incident.id}`;
    expect(await notifications(incident.id)).toEqual(
      notified.map((userId) => ({
        user_id: userId,
        kind: 'channel.expiring',
        payload: { provider: 'fake', socialAccountId: accountId, reason: 'auth_expiring' },
        dedupe_key: dedupeKey,
      })),
    );

    const spy = spied();
    for (let run = 0; run < 2; run++) {
      expect(JSON.parse(await refreshExpiring(spy.deps))).toMatchObject({
        expiring: 0,
        alreadyWarned: 1,
      });
    }

    expect(spy.opened).toEqual([]);
    expect(await incidents(accountId)).toEqual([incident]);
    expect(await events(accountId, 'channel.expiring')).toHaveLength(1);
    expect(await notifications(incident.id)).toHaveLength(notified.length);
    expect(fake.refreshes.length).toBe(calls);
  });

  it('gives a failed refresh the first half of the warn lead before warning', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'self_refresh', warnLeadMs: 60 * MINUTE_MS });
    const accountId = await fixture.connectAccount(fixture.appId, {
      accessExpiresAt: inMs(45 * MINUTE_MS),
    });
    fake.scriptRefresh({ kind: 'fail', error: { kind: 'transient' } });

    expect(await sweep()).toMatchObject({ due: 1, transient: 1, expiring: 0 });
    expect(await incidents(accountId)).toEqual([]);
  });

  it('warns when a failed refresh leaves the credential inside half the warn lead', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'self_refresh', warnLeadMs: 60 * MINUTE_MS });
    const expiresAt = inMs(20 * MINUTE_MS);
    const accountId = await fixture.connectAccount(fixture.appId, { accessExpiresAt: expiresAt });
    fake.scriptRefresh({ kind: 'fail', error: { kind: 'transient' } });

    expect(await sweep()).toMatchObject({ due: 1, transient: 1, expiring: 1 });

    const [incident] = await incidents(accountId);
    if (incident === undefined) throw new Error('no incident');
    expect(incident.kind).toBe('auth_expiring');
    expect(await events(accountId, 'channel.expiring')).toEqual([
      expectedEvent(accountId, incident.id, expiresAt),
    ]);
    expect((await notifications(incident.id)).map((row) => row.user_id)).toEqual(notified);
  });

  it('resolves the incident on a successful refresh and warns again on the next spell', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'self_refresh', warnLeadMs: 60 * MINUTE_MS });
    const accountId = await fixture.connectAccount(fixture.appId, {
      accessExpiresAt: inMs(20 * MINUTE_MS),
    });
    fake.scriptRefresh(
      { kind: 'fail', error: { kind: 'transient' } },
      {
        kind: 'issue',
        issued: {
          credentials: { token: 'renewed' },
          grantedScopes: [],
          accessExpiresAt: inMs(20 * MINUTE_MS),
        },
      },
      { kind: 'fail', error: { kind: 'transient' } },
    );

    await sweep();
    const [first] = await incidents(accountId);
    expect(first).toMatchObject({ kind: 'auth_expiring', resolved_at: null });

    expect(await sweep()).toMatchObject({ refreshed: 1, expiring: 0 });
    expect(await incidents(accountId)).toEqual([{ ...first, resolved_at: expect.any(Date) }]);

    expect(await sweep()).toMatchObject({ transient: 1, expiring: 1 });
    const [, second] = await incidents(accountId);
    if (first === undefined || second === undefined) throw new Error('missing incidents');
    expect(second).toMatchObject({ kind: 'auth_expiring', occurrences: 1, resolved_at: null });
    expect(second.id).not.toBe(first.id);
    expect((await events(accountId, 'channel.expiring')).map((e) => e.dedupe_key)).toEqual([
      `channel.expiring.${accountId}.${first.id}`,
      `channel.expiring.${accountId}.${second.id}`,
    ]);
    expect(await notifications(second.id)).toHaveLength(notified.length);
  });

  it('flags a rejected refresh as needs_reauth without warning it is expiring', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'self_refresh', warnLeadMs: 60 * MINUTE_MS });
    const accountId = await fixture.connectAccount(fixture.appId, {
      accessExpiresAt: inMs(20 * MINUTE_MS),
    });
    fake.scriptRefresh({ kind: 'fail', error: { kind: 'auth_revoked' } });

    expect(await sweep()).toMatchObject({ rejected: 1, expiring: 0 });

    expect((await incidents(accountId)).map((row) => row.kind)).toEqual(['auth_revoked']);
    expect(await events(accountId, 'channel.needs_reauth')).toHaveLength(1);
    expect(await events(accountId, 'channel.expiring')).toEqual([]);
  });

  it('refreshes a due credential while unrefreshable credentials fill the warning window', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'self_refresh', warnLeadMs: 60 * MINUTE_MS });
    const staticApp = await fixture.createApp('static-client', STATIC);
    const statics: string[] = [];
    for (let n = 0; n < 3; n++) {
      statics.push(
        await fixture.connectAccount(staticApp, {
          provider: STATIC,
          accessExpiresAt: inMs(2 * DAY_MS),
        }),
      );
    }
    const accountId = await fixture.connectAccount(fixture.appId, {
      accessExpiresAt: inMs(20 * MINUTE_MS),
    });
    fake.scriptRefresh({
      kind: 'issue',
      issued: {
        credentials: { token: 'renewed' },
        grantedScopes: [],
        accessExpiresAt: inMs(DAY_MS),
      },
    });
    const spy = spied(withStatic(3 * DAY_MS));

    expect(JSON.parse(await refreshExpiring(spy.deps, 2))).toMatchObject({
      due: 1,
      refreshed: 1,
      expiring: 1,
    });

    expect(spy.leads).toEqual([3600, 3 * 86_400]);
    const stored = await fixture.db.withTenant(fixture.workspaceId, SYSTEM, (trx) =>
      loadCredential(trx, fixture.keyring, {
        workspaceId: fixture.workspaceId,
        socialAccountId: accountId,
        kind: 'oauth',
      }),
    );
    expect(stored).toMatchObject({ version: 2, value: { token: 'renewed' } });
    expect(await incidents(accountId)).toEqual([]);
    const warned = await Promise.all(statics.map(incidents));
    expect(warned.map((rows) => rows.map((row) => row.kind))).toEqual([['auth_expiring'], [], []]);
  });

  it('runs no warning pass when every registered provider can refresh', async () => {
    fixture.fake.configureAuth({ refresh: 'self_refresh', warnLeadMs: 60 * MINUTE_MS });
    const spy = spied();

    await refreshExpiring(spy.deps);

    expect(spy.leads).toEqual([3600]);
  });
});
