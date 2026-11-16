import type { Actor } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { HttpClient } from '@kronaut/egress';
import type { JobHelpers } from 'graphile-worker';
import { sql } from 'kysely';
import { pino } from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { idleMediaGc } from '../../actors/media/testing/db.ts';
import { createProviderRegistry } from '../../base/providers/providers.ts';
import { cronTaskList } from '../../cron.ts';
import { CRON_TASKS } from '../../infrastructure/jobs/cron-tasks.ts';
import { type PublishFixture, startPublishFixture } from '../../steps/publish/testing.ts';
import { DISCONNECTED_CREDENTIAL_DAYS } from './retention.ts';

const SYSTEM: Actor = { kind: 'system' };
const RETAINED = 'retained';

let test: TestDatabase;
let fixture: PublishFixture;
let retainedApp: string;

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startPublishFixture(test, 'ws-credential-retention');
  retainedApp = await fixture.createApp('retained-client', RETAINED);
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

async function account(status: string, ageDays: number, provider?: string): Promise<string> {
  const id = await (provider === undefined
    ? fixture.connectAccount(fixture.appId)
    : fixture.connectAccount(retainedApp, { provider }));
  await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('social_accounts')
      .set({
        status,
        status_changed_at: sql<Date>`now() - make_interval(secs => ${ageDays * 86_400})`,
      })
      .where('id', '=', id)
      .execute(),
  );
  return id;
}

async function withCredentials(): Promise<string[]> {
  const rows = await fixture.owner.withActor(SYSTEM, (trx) =>
    trx.selectFrom('account_credentials').select('social_account_id').execute(),
  );
  return rows.map((row) => row.social_account_id).sort();
}

async function runRetention(): Promise<unknown> {
  const { fake } = fixture;
  const retained = {
    ...fake.manifest,
    id: RETAINED,
    dataRetention: { disconnectedDays: 7, lapsedDays: 30 },
  };
  const providers = createProviderRegistry(
    [fake.manifest, retained],
    [fake.runtime, { ...fake.runtime, id: RETAINED }],
    () => ({}) as HttpClient,
  );
  const tasks = cronTaskList(fixture.db, pino({ level: 'silent' }), {
    ...fixture.deps,
    ...idleMediaGc(),
    providers,
  });
  await tasks[CRON_TASKS.credentialRetention]?.({}, {} as JobHelpers);
  const run = await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('cron_runs')
      .select(['outcome', 'detail'])
      .where('task', '=', CRON_TASKS.credentialRetention)
      .orderBy('started_at', 'desc')
      .orderBy('id', 'desc')
      .executeTakeFirstOrThrow(),
  );
  expect(run.outcome).toBe('ok');
  return JSON.parse(run.detail ?? '');
}

async function withData(accountId: string, provider: string): Promise<string> {
  const { destinationId } = await fixture.seed({ accountId, provider });
  await fixture.owner.withActor(SYSTEM, async (trx) => {
    const workspace_id = fixture.workspaceId;
    const observed_at = sql<Date>`now()`;
    const origin = { observed_at, provider, api_version: 'v3' };
    await trx
      .updateTable('post_destinations')
      .set({ remote_id: 'kept-video' })
      .where('id', '=', destinationId)
      .execute();
    await trx
      .insertInto('post_metric_snapshots')
      .values({ workspace_id, destination_id: destinationId, metric: 'views', value: 5, ...origin })
      .execute();
    await trx
      .insertInto('destination_metric_pulls')
      .values({ workspace_id, destination_id: destinationId, step: 1 })
      .execute();
    await trx
      .insertInto('account_daily_metrics')
      .values({
        workspace_id,
        social_account_id: accountId,
        day: '2026-11-01',
        metric: 'followers',
        value: 10,
        ...origin,
      })
      .execute();
  });
  return destinationId;
}

async function stateOf(accountId: string, destinationId: string) {
  return await fixture.owner.withActor(SYSTEM, async (trx) => {
    const count = (table: 'post_metric_snapshots' | 'destination_metric_pulls') =>
      trx
        .selectFrom(table)
        .select((eb) => eb.fn.countAll<string>().as('n'))
        .where('destination_id', '=', destinationId)
        .executeTakeFirstOrThrow();
    const profile = await trx
      .selectFrom('social_accounts')
      .select(['display_name', 'handle', 'profile_url', 'provider_subject_id'])
      .where('id', '=', accountId)
      .executeTakeFirstOrThrow();
    const daily = await trx
      .selectFrom('account_daily_metrics')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('social_account_id', '=', accountId)
      .executeTakeFirstOrThrow();
    const destination = await trx
      .selectFrom('post_destinations')
      .select('remote_id')
      .where('id', '=', destinationId)
      .executeTakeFirst();
    const audits = await trx
      .selectFrom('audit_events')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('resource_id', '=', accountId)
      .where('action', '=', 'channel.data_purged')
      .executeTakeFirstOrThrow();
    return {
      displayName: profile.display_name,
      wiped: profile.handle === null && profile.profile_url === null,
      data: [
        Number((await count('post_metric_snapshots')).n),
        Number((await count('destination_metric_pulls')).n),
        Number(daily.n),
      ],
      remoteId: destination?.remote_id ?? null,
      audits: Number(audits.n),
    };
  });
}

describe('credential retention', () => {
  it('purges credentials only of channels disconnected past the retention window', async () => {
    const drop = DISCONNECTED_CREDENTIAL_DAYS + 1;
    const active = await account('active', drop);
    const recent = await account('disconnected', DISCONNECTED_CREDENTIAL_DAYS - 1);
    const expired = await account('disconnected', drop);

    expect(await runRetention()).toMatchObject({ credentials: 1, purgedAccounts: 0 });

    const kept = await withCredentials();
    expect(kept).toContain(active);
    expect(kept).toContain(recent);
    expect(kept).not.toContain(expired);
  });
});

describe('provider data retention', () => {
  it("purges a lapsed channel's data and keeps its publish record, once", async () => {
    const cases = {
      disconnected: await account('disconnected', 8, RETAINED),
      marginDisconnect: await account('disconnected', 5.5, RETAINED),
      recentDisconnect: await account('disconnected', 4, RETAINED),
      lapsed: await account('needs_reauth', 31, RETAINED),
      marginLapse: await account('needs_reauth', 28.5, RETAINED),
      recentLapse: await account('needs_reauth', 27, RETAINED),
      otherProvider: await account('disconnected', 8),
    };
    const destinations = new Map<string, string>();
    for (const [name, id] of Object.entries(cases)) {
      destinations.set(id, await withData(id, name === 'otherProvider' ? 'fake' : RETAINED));
    }
    await fixture.owner.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('social_accounts')
        .set({ handle: '@retained', profile_url: 'https://x.test/c', provider_subject_id: 's' })
        .where('id', 'in', Object.values(cases))
        .execute(),
    );

    expect(await runRetention()).toMatchObject({ credentials: 0, purgedAccounts: 4 });
    expect(await runRetention()).toMatchObject({ purgedAccounts: 0 });

    const state = (id: string) => stateOf(id, destinations.get(id) ?? '');
    const purged = { displayName: '', wiped: true, data: [0, 0, 0], remoteId: 'kept-video' };
    const kept = { displayName: 'Fake account', wiped: false, data: [1, 1, 1], audits: 0 };
    expect(await state(cases.disconnected)).toEqual({ ...purged, audits: 1 });
    expect(await state(cases.lapsed)).toEqual({ ...purged, audits: 1 });
    expect(await state(cases.marginDisconnect)).toEqual({ ...purged, audits: 1 });
    expect(await state(cases.marginLapse)).toEqual({ ...purged, audits: 1 });
    expect(await state(cases.recentDisconnect)).toMatchObject(kept);
    expect(await state(cases.recentLapse)).toMatchObject(kept);
    expect(await state(cases.otherProvider)).toMatchObject(kept);
    const credentials = await withCredentials();
    expect(credentials).not.toContain(cases.disconnected);
    expect(credentials).not.toContain(cases.lapsed);
    expect(credentials).not.toContain(cases.marginDisconnect);
    expect(credentials).not.toContain(cases.marginLapse);
    expect(credentials).toEqual(
      expect.arrayContaining([cases.recentDisconnect, cases.recentLapse, cases.otherProvider]),
    );
  });
});
