import { randomUUID } from 'node:crypto';
import type { Actor } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { JobHelpers } from 'graphile-worker';
import { sql } from 'kysely';
import { pino } from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CRON_TASKS, cronTaskList } from '../cron.ts';
import { createStaging } from '../media/staging.ts';
import { type PublishFixture, startPublishFixture } from '../publish/testing.ts';
import { NOTIFICATION_RETENTION_DAYS, purgeNotifications } from './retention.ts';

const SYSTEM: Actor = { kind: 'system' };

let test: TestDatabase;
let fixture: PublishFixture;
let otherUserId: string;
let otherWorkspaceId: string;

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startPublishFixture(test, 'ws-retention');
  otherUserId = await fixture.createUser('other');
  otherWorkspaceId = await fixture.db.withActor({ kind: 'user', id: otherUserId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Org B', 'Workspace B', 'ws-retention-b', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

async function insert(workspaceId: string, userId: string, ageDays: number, count = 1) {
  const rows = Array.from({ length: count }, () => ({
    workspace_id: workspaceId,
    user_id: userId,
    kind: 'channel.needs_reauth',
    payload: JSON.stringify({ provider: 'fake', socialAccountId: randomUUID(), reason: null }),
    dedupe_key: `test.${randomUUID()}`,
    created_at: sql<Date>`now() - make_interval(days => ${ageDays})`,
  }));
  await fixture.owner.withActor(SYSTEM, (trx) =>
    trx.insertInto('notifications').values(rows).execute(),
  );
}

async function ages(workspaceId: string): Promise<number[]> {
  const rows = await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('notifications')
      .select(sql<number>`extract(day from now() - created_at)::integer`.as('age'))
      .where('workspace_id', '=', workspaceId)
      .orderBy('age')
      .execute(),
  );
  return rows.map((row) => row.age);
}

async function clear(): Promise<void> {
  await fixture.owner.withActor(SYSTEM, (trx) => trx.deleteFrom('notifications').execute());
}

describe('notification retention', () => {
  it('deletes only notifications past the retention window in every workspace', async () => {
    await clear();
    const keep = NOTIFICATION_RETENTION_DAYS - 1;
    const drop = NOTIFICATION_RETENTION_DAYS + 1;
    await insert(fixture.workspaceId, fixture.ownerUserId, 0);
    await insert(fixture.workspaceId, fixture.ownerUserId, keep);
    await insert(fixture.workspaceId, fixture.ownerUserId, drop, 2);
    await insert(otherWorkspaceId, otherUserId, keep);
    await insert(otherWorkspaceId, otherUserId, drop);
    const tasks = cronTaskList(fixture.db, pino({ level: 'silent' }), {
      ...fixture.deps,
      staging: createStaging('/nonexistent'),
    });

    await tasks[CRON_TASKS.notificationRetention]?.({}, {} as JobHelpers);

    expect(await ages(fixture.workspaceId)).toEqual([0, keep]);
    expect(await ages(otherWorkspaceId)).toEqual([keep]);
    const run = await fixture.owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('cron_runs')
        .select(['outcome', 'detail', 'finished_at'])
        .where('task', '=', CRON_TASKS.notificationRetention)
        .executeTakeFirstOrThrow(),
    );
    expect(run.outcome).toBe('ok');
    expect(run.finished_at).not.toBeNull();
    expect(JSON.parse(run.detail ?? '')).toEqual({ workspaces: 2, notifications: 3 });
  });

  it('pages through more expired rows than one batch holds', async () => {
    await clear();
    await insert(fixture.workspaceId, fixture.ownerUserId, NOTIFICATION_RETENTION_DAYS + 5, 5);
    await insert(fixture.workspaceId, fixture.ownerUserId, 1);

    const detail = JSON.parse(await purgeNotifications(fixture.db, 2));

    expect(detail).toEqual({ workspaces: 2, notifications: 5 });
    expect(await ages(fixture.workspaceId)).toEqual([1]);
  });
});
