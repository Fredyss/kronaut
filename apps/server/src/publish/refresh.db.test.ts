import { setTimeout as sleep } from 'node:timers/promises';
import type { Actor } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { activateKey, createKey } from '../cli/provider-apps.ts';
import { loadCredential } from '../credentials/credential-store.ts';
import { refreshCredential, refreshExpiring } from './refresh.ts';
import { runPublish } from './task.ts';
import { type PublishFixture, type Seeded, startPublishFixture } from './testing.ts';

const SYSTEM: Actor = { kind: 'system' };
const MINUTE_MS = 60_000;

let test: TestDatabase;
let fixture: PublishFixture;

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startPublishFixture(test, 'ws-refresh');
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

function inMinutes(minutes: number): Temporal.Instant {
  return Temporal.Now.instant().add({ milliseconds: minutes * MINUTE_MS });
}

async function credential(accountId: string) {
  const stored = await fixture.db.withTenant(fixture.workspaceId, SYSTEM, (trx) =>
    loadCredential(trx, fixture.keyring, {
      workspaceId: fixture.workspaceId,
      socialAccountId: accountId,
      kind: 'oauth',
    }),
  );
  if (stored === null) throw new Error('credential not found');
  const lease = await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('account_credentials')
      .select(['refresh_lease_until', 'refresh_lease_owner'])
      .where('id', '=', stored.id)
      .executeTakeFirstOrThrow(),
  );
  return { ...stored, ...lease };
}

function target(stored: { id: string; version: number }) {
  return {
    workspaceId: fixture.workspaceId,
    credentialId: stored.id,
    expectedVersion: stored.version,
  };
}

function destination(seeded: Seeded) {
  return fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .select(['state', 'state_reason'])
      .where('id', '=', seeded.destinationId)
      .executeTakeFirstOrThrow(),
  );
}

async function setAppStatus(appId: string, status: string): Promise<void> {
  await fixture.owner.withActor(SYSTEM, (trx) =>
    trx.updateTable('provider_apps').set({ status }).where('id', '=', appId).execute(),
  );
}

function publish(seeded: Seeded): Promise<void> {
  return runPublish(fixture.deps, { workspaceId: fixture.workspaceId, id: seeded.destinationId });
}

function makeDue(seeded: Seeded) {
  return fixture.owner.withActor(SYSTEM, (trx) =>
    sql`update post_destinations set run_at = now() - interval '1 second'
         where id = ${seeded.destinationId}`.execute(trx),
  );
}

async function rotate(appId: string): Promise<string> {
  const deps = {
    db: fixture.operator,
    keyring: fixture.keyring,
    logger: pino({ level: 'silent' }),
  };
  const kid = await createKey(deps, appId);
  await activateKey(deps, appId, kid);
  const { id } = await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('provider_app_keys')
      .select('id')
      .where('provider_app_id', '=', appId)
      .where('kid', '=', kid)
      .executeTakeFirstOrThrow(),
  );
  return id;
}

describe('credential refresh', () => {
  it('signs a refresh with the key the session is bound to after a rotation', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'reusable', warnLeadMs: 0 });
    const appId = await fixture.createApp('fake-keys');
    const bound = await rotate(appId);
    const accountId = await fixture.connectAccount(appId, { clientKeyId: bound });
    await rotate(appId);
    fake.scriptRefresh({
      kind: 'issue',
      issued: { credentials: { token: 'k' }, grantedScopes: [] },
    });

    const outcome = await refreshCredential(
      fixture.deps,
      target(await credential(accountId)),
      'skip',
    );

    expect(outcome).toEqual({ kind: 'refreshed', version: 2 });
    expect(fake.refreshes.at(-1)?.signingKey?.id).toBe(bound);
  });

  it('refreshes a due credential from the cron and persists it before use', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'reusable', warnLeadMs: 0 });
    const accountId = await fixture.connectAccount(fixture.appId, {
      value: { token: 'old' },
      accessExpiresAt: inMinutes(5),
    });
    fake.scriptRefresh({
      kind: 'issue',
      issued: { credentials: { token: 'new' }, grantedScopes: [], accessExpiresAt: inMinutes(120) },
    });
    const calls = fake.refreshes.length;

    await refreshExpiring(fixture.deps);

    expect(await credential(accountId)).toMatchObject({
      version: 2,
      value: { token: 'new' },
      refresh_lease_until: null,
      refresh_lease_owner: null,
    });
    expect(fake.refreshes.slice(calls)).toEqual([
      {
        account: expect.objectContaining({ providerAccountId: expect.stringMatching(/^fake-/) }),
        credentials: { token: 'old' },
      },
    ]);
  });

  it('makes one provider call for two concurrent waiting refreshes', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'reusable', warnLeadMs: 0 });
    const accountId = await fixture.connectAccount(fixture.appId);
    const stored = await credential(accountId);
    let entered!: () => void;
    let release!: () => void;
    const inside = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    fake.scriptRefresh({
      kind: 'issue',
      issued: { credentials: { token: 'shared' }, grantedScopes: [] },
      during: async () => {
        entered();
        await gate;
      },
    });
    const calls = fake.refreshes.length;

    const first = refreshCredential(fixture.deps, target(stored), 'wait');
    await inside;
    const second = refreshCredential(fixture.deps, target(stored), 'wait');
    await sleep(300);
    release();

    expect(await Promise.all([first, second])).toEqual([
      { kind: 'refreshed', version: 2 },
      { kind: 'refreshed', version: 2 },
    ]);
    expect(fake.refreshes.length - calls).toBe(1);
  });

  it('flags a lost single-use token after taking over a crashed holder', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'single_use', warnLeadMs: 60 * MINUTE_MS });
    const accountId = await fixture.connectAccount(fixture.appId, {
      accessExpiresAt: inMinutes(5),
      refreshExpiresAt: inMinutes(30),
    });
    await fixture.owner.withActor(SYSTEM, (trx) =>
      sql`update account_credentials
             set refresh_lease_until = now() - interval '1 second',
                 refresh_lease_owner = 'dead-worker:lease'
           where social_account_id = ${accountId}`.execute(trx),
    );
    fake.scriptRefresh({ kind: 'fail', error: { kind: 'auth_revoked' } });

    const summary = JSON.parse(await refreshExpiring(fixture.deps));

    expect(summary).toMatchObject({ due: 1, rejected: 1 });
    const account = await fixture.owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('social_accounts')
        .select(['status', 'status_reason'])
        .where('id', '=', accountId)
        .executeTakeFirstOrThrow(),
    );
    expect(account).toEqual({ status: 'needs_reauth', status_reason: 'refresh_token_lost' });
    const incidents = await fixture.owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('channel_incidents')
        .select('kind')
        .where('social_account_id', '=', accountId)
        .execute(),
    );
    expect(incidents).toEqual([{ kind: 'refresh_token_lost' }]);
    expect(await credential(accountId)).toMatchObject({ version: 1, refresh_lease_owner: null });
  });

  it('refreshes an expired token on the publish path and publishes with the new one', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'reusable', warnLeadMs: 0 });
    const seeded = await fixture.seed();
    fake.script(
      { kind: 'fail', error: { kind: 'auth_expired' }, at: 'before_public' },
      { kind: 'publish', remoteId: 'r-refreshed' },
    );
    fake.scriptRefresh({
      kind: 'issue',
      issued: { credentials: { token: 'fresh' }, grantedScopes: [] },
    });

    await publish(seeded);
    expect(await destination(seeded)).toEqual({
      state: 'retry_wait',
      state_reason: 'auth_refreshed',
    });

    await makeDue(seeded);
    await publish(seeded);
    expect(await destination(seeded)).toEqual({ state: 'published', state_reason: null });
    expect(fake.calls.at(-1)?.credentials).toEqual({ token: 'fresh' });
  });

  it('blocks a second expired token after a refresh without refreshing again', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'reusable', warnLeadMs: 0 });
    const seeded = await fixture.seed();
    fake.script(
      { kind: 'fail', error: { kind: 'auth_expired' }, at: 'before_public' },
      { kind: 'fail', error: { kind: 'auth_expired' }, at: 'before_public' },
    );
    fake.scriptRefresh({
      kind: 'issue',
      issued: { credentials: { token: 'fresh' }, grantedScopes: [] },
    });

    await publish(seeded);
    const calls = fake.refreshes.length;
    await makeDue(seeded);
    await publish(seeded);

    expect(await destination(seeded)).toEqual({
      state: 'blocked',
      state_reason: 'account_needs_reauth',
    });
    expect(fake.refreshes.length).toBe(calls);
  });

  it('keeps the lease after an ambiguous single-use refresh', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'single_use', warnLeadMs: 0 });
    const accountId = await fixture.connectAccount(fixture.appId);
    fake.scriptRefresh({ kind: 'throw' });

    const outcome = await refreshCredential(
      fixture.deps,
      target(await credential(accountId)),
      'skip',
    );

    expect(outcome).toEqual({ kind: 'transient' });
    const stored = await credential(accountId);
    expect(stored.version).toBe(1);
    expect(stored.refresh_lease_owner).toMatch(/^publish-test:/);
  });

  for (const status of ['disabled', 'misconfigured'] as const) {
    it(`never calls the provider through a ${status} app`, async () => {
      const { fake } = fixture;
      fake.configureAuth({ refresh: 'reusable', warnLeadMs: 0 });
      const appId = await fixture.createApp(`fake-${status}`);
      const accountId = await fixture.connectAccount(appId, {
        value: { token: 'old' },
        accessExpiresAt: inMinutes(5),
      });
      await setAppStatus(appId, status);
      const calls = fake.refreshes.length;

      const summary = JSON.parse(await refreshExpiring(fixture.deps));
      const direct = await refreshCredential(
        fixture.deps,
        target(await credential(accountId)),
        'wait',
      );

      expect(summary).toMatchObject({ skipped: 1 });
      expect(direct).toEqual({ kind: 'skipped' });
      expect(fake.refreshes.length).toBe(calls);
      expect(await credential(accountId)).toMatchObject({
        version: 1,
        value: { token: 'old' },
        refresh_lease_owner: null,
      });
      await fixture.owner.withActor(SYSTEM, (trx) =>
        trx
          .updateTable('social_accounts')
          .set({ status: 'disconnected' })
          .where('id', '=', accountId)
          .execute(),
      );
    });
  }

  it('does not refresh on the publish path once the app is disabled, and blocks next claim', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'reusable', warnLeadMs: 0 });
    const appId = await fixture.createApp('fake-disabled-mid-run');
    const seeded = await fixture.seed({ appId });
    fake.script({
      kind: 'fail',
      error: { kind: 'auth_expired' },
      at: 'before_public',
      beforePublic: () => setAppStatus(appId, 'disabled'),
    });
    const calls = fake.refreshes.length;

    await publish(seeded);
    expect(await destination(seeded)).toEqual({
      state: 'retry_wait',
      state_reason: 'transient_error',
    });

    await makeDue(seeded);
    await publish(seeded);
    expect(await destination(seeded)).toEqual({
      state: 'blocked',
      state_reason: 'app_credentials_invalid',
    });
    expect(fake.refreshes.length).toBe(calls);
  });

  it('reaches a due credential behind more than a hundred that are not due', async () => {
    const { fake } = fixture;
    fake.configureAuth({ refresh: 'reusable', warnLeadMs: 0 });
    for (let filler = 0; filler < 101; filler++) {
      await fixture.connectAccount(fixture.appId, {
        accessExpiresAt: inMinutes(120),
        refreshExpiresAt: inMinutes(10),
      });
    }
    const accountId = await fixture.connectAccount(fixture.appId, {
      accessExpiresAt: inMinutes(12),
    });
    fake.scriptRefresh({
      kind: 'issue',
      issued: {
        credentials: { token: 'late' },
        grantedScopes: [],
        accessExpiresAt: inMinutes(120),
      },
    });

    await refreshExpiring(fixture.deps);

    expect(await credential(accountId)).toMatchObject({ version: 2, value: { token: 'late' } });
  });
});
