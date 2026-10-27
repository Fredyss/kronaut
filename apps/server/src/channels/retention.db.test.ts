import type { Actor } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { JobHelpers } from 'graphile-worker';
import { sql } from 'kysely';
import { pino } from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CRON_TASKS, cronTaskList } from '../cron.ts';
import { type PublishFixture, startPublishFixture } from '../publish/testing.ts';
import { DISCONNECTED_CREDENTIAL_DAYS } from './retention.ts';

const SYSTEM: Actor = { kind: 'system' };

let test: TestDatabase;
let fixture: PublishFixture;

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startPublishFixture(test, 'ws-credential-retention');
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

async function account(status: string, ageDays: number): Promise<string> {
  const id = await fixture.connectAccount(fixture.appId);
  await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('social_accounts')
      .set({
        status,
        status_changed_at: sql<Date>`now() - make_interval(days => ${ageDays})`,
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

describe('credential retention', () => {
  it('purges credentials only of channels disconnected past the retention window', async () => {
    const drop = DISCONNECTED_CREDENTIAL_DAYS + 1;
    const active = await account('active', drop);
    const recent = await account('disconnected', DISCONNECTED_CREDENTIAL_DAYS - 1);
    const expired = await account('disconnected', drop);
    const tasks = cronTaskList(fixture.db, pino({ level: 'silent' }), fixture.deps);

    await tasks[CRON_TASKS.credentialRetention]?.({}, {} as JobHelpers);

    const kept = await withCredentials();
    expect(kept).toContain(active);
    expect(kept).toContain(recent);
    expect(kept).not.toContain(expired);
    const run = await fixture.owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('cron_runs')
        .select(['outcome', 'detail'])
        .where('task', '=', CRON_TASKS.credentialRetention)
        .executeTakeFirstOrThrow(),
    );
    expect(run.outcome).toBe('ok');
    expect(JSON.parse(run.detail ?? '')).toMatchObject({ credentials: 1 });
  });
});
