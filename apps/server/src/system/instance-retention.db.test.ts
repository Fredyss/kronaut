import { randomBytes } from 'node:crypto';
import type { Actor } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { JobHelpers } from 'graphile-worker';
import { sql } from 'kysely';
import { pino } from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CRON_TASKS, cronTaskList } from '../cron.ts';
import { idleMediaGc } from '../media/testing/db.ts';
import { type PublishFixture, startPublishFixture } from '../publish/testing.ts';
import { purgeInstanceRetention } from './instance-retention.ts';

const SYSTEM: Actor = { kind: 'system' };

let test: TestDatabase;
let fixture: PublishFixture;

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startPublishFixture(test, 'ws-instance-retention');
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

async function insertSession(expiresInDays: number): Promise<string> {
  const expires = sql<Date>`now() + make_interval(days => ${expiresInDays})`;
  const row = await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .insertInto('sessions')
      .values({
        token_hash: randomBytes(32),
        user_id: fixture.ownerUserId,
        expires_at: expires,
        idle_expires_at: expires,
        reauthenticated_at: sql<Date>`now()`,
      })
      .returning('id')
      .executeTakeFirstOrThrow(),
  );
  return row.id;
}

async function insertCronRun(ageDays: number): Promise<string> {
  const row = await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .insertInto('cron_runs')
      .values({ task: 'seeded', started_at: sql<Date>`now() - make_interval(days => ${ageDays})` })
      .returning('id')
      .executeTakeFirstOrThrow(),
  );
  return row.id;
}

async function remaining(table: 'sessions' | 'cron_runs', ids: string[]): Promise<string[]> {
  const rows = await fixture.owner.withActor(SYSTEM, (trx) =>
    trx.selectFrom(table).select('id').where('id', 'in', ids).execute(),
  );
  return rows.map((row) => row.id);
}

describe('instance retention', () => {
  it('purges expired sessions and old cron runs and keeps fresh rows', async () => {
    const expiredSession = await insertSession(-1);
    const liveSession = await insertSession(1);
    const oldRun = await insertCronRun(91);
    const freshRun = await insertCronRun(89);
    const tasks = cronTaskList(fixture.db, pino({ level: 'silent' }), {
      ...fixture.deps,
      ...idleMediaGc(),
    });

    await tasks[CRON_TASKS.instanceRetention]?.({}, {} as JobHelpers);

    expect(await remaining('sessions', [expiredSession, liveSession])).toEqual([liveSession]);
    expect(await remaining('cron_runs', [oldRun, freshRun])).toEqual([freshRun]);
    const run = await fixture.owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('cron_runs')
        .select(['outcome', 'detail'])
        .where('task', '=', CRON_TASKS.instanceRetention)
        .executeTakeFirstOrThrow(),
    );
    expect(run.outcome).toBe('ok');
    expect(JSON.parse(run.detail ?? '')).toMatchObject({
      sessions: expect.any(Number),
      cron_runs: expect.any(Number),
      'meta_lifecycle_requests.pending': expect.any(Number),
    });
  });

  it('drains more expired rows than one batch holds', async () => {
    const expired = await Promise.all([insertSession(-1), insertSession(-2), insertSession(-3)]);

    const detail = JSON.parse(await purgeInstanceRetention(fixture.db, 1));

    expect(await remaining('sessions', expired)).toEqual([]);
    expect(detail.sessions).toBe(3);
  });
});
