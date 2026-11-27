import { randomUUID } from 'node:crypto';
import type { Actor } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { JobHelpers } from 'graphile-worker';
import { sql } from 'kysely';
import { pino } from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { idleMediaGc } from '../../actors/media/testing/db.ts';
import { cronTaskList } from '../../cron.ts';
import { type PublishFixture, startPublishFixture } from '../../steps/publish/testing.ts';
import { CRON_TASKS } from './cron-tasks.ts';
import { purgeIdempotencyKeys } from './idempotency-retention.ts';

const SYSTEM: Actor = { kind: 'system' };
const silent = pino({ level: 'silent' });

let test: TestDatabase;
let fixture: PublishFixture;
let otherWorkspaceId: string;

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startPublishFixture(test, 'ws-idem-retention');
  const otherUserId = await fixture.createUser('other');
  otherWorkspaceId = await fixture.db.withActor({ kind: 'user', id: otherUserId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Org B', 'Workspace B', 'ws-idem-retention-b', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

async function insert(workspaceId: string, expiresInHours: number, count = 1) {
  const rows = Array.from({ length: count }, () => ({
    workspace_id: workspaceId,
    actor_key: 'grant:test',
    key: `key-${randomUUID()}`,
    request_hash: Buffer.alloc(32),
    state: 'completed',
    response_status: 200,
    response_body: JSON.stringify({}),
    expires_at: sql<Date>`now() + make_interval(hours => ${expiresInHours})`,
  }));
  await fixture.owner.withActor(SYSTEM, (trx) =>
    trx.insertInto('idempotency_keys').values(rows).execute(),
  );
}

async function remaining(workspaceId: string): Promise<number> {
  const row = await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('idempotency_keys')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .where('workspace_id', '=', workspaceId)
      .executeTakeFirstOrThrow(),
  );
  return Number(row.n);
}

async function clear(): Promise<void> {
  await fixture.owner.withActor(SYSTEM, (trx) => trx.deleteFrom('idempotency_keys').execute());
}

describe('idempotency key retention', () => {
  it('deletes only expired keys in every workspace', async () => {
    await clear();
    await insert(fixture.workspaceId, 1);
    await insert(fixture.workspaceId, 6 * 24);
    await insert(fixture.workspaceId, -1, 2);
    await insert(otherWorkspaceId, -24);
    await insert(otherWorkspaceId, 23);
    const tasks = cronTaskList(fixture.db, silent, { ...fixture.deps, ...idleMediaGc() });

    await tasks[CRON_TASKS.idempotencyRetention]?.({}, {} as JobHelpers);

    expect(await remaining(fixture.workspaceId)).toBe(2);
    expect(await remaining(otherWorkspaceId)).toBe(1);
    const run = await fixture.owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('cron_runs')
        .select(['outcome', 'detail'])
        .where('task', '=', CRON_TASKS.idempotencyRetention)
        .executeTakeFirstOrThrow(),
    );
    expect(run.outcome).toBe('ok');
    expect(JSON.parse(run.detail ?? '')).toEqual({ workspaces: 2, keys: 3, failed: 0 });
  });

  it('pages through more expired keys than one batch holds', async () => {
    await clear();
    await insert(fixture.workspaceId, -2, 5);
    await insert(fixture.workspaceId, 2);

    const detail = JSON.parse(await purgeIdempotencyKeys({ db: fixture.db, logger: silent }, 2));

    expect(detail).toEqual({ workspaces: 2, keys: 5, failed: 0 });
    expect(await remaining(fixture.workspaceId)).toBe(1);
  });
});
