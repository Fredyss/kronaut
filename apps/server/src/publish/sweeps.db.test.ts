import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { enqueuePublish } from '../jobs.ts';
import { reapLeases, sweepDue } from './sweeps.ts';
import type { Seeded } from './testing.ts';
import {
  audits,
  CLI,
  db,
  deps,
  fake,
  owner,
  publish,
  queuedRunAt,
  SYSTEM,
  seed,
  startHarness,
  stopHarness,
  strand,
  updateDestination,
  workspaceId,
} from './testing-harness.ts';

let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startHarness(test, 'ws-publish');
});

afterAll(async () => {
  await stopHarness();
  await test?.stop();
});

function destination(seeded: Seeded) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .selectAll()
      .where('id', '=', seeded.destinationId)
      .executeTakeFirstOrThrow(),
  );
}

function attempts(seeded: Seeded) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('publish_attempts')
      .selectAll()
      .where('destination_id', '=', seeded.destinationId)
      .orderBy('attempt_no')
      .execute(),
  );
}

function items(seeded: Seeded) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('destination_items')
      .selectAll()
      .where('destination_id', '=', seeded.destinationId)
      .orderBy('position')
      .execute(),
  );
}

describe('publish sweeps', () => {
  it('enqueues a past-due destination whose job is gone', async () => {
    const seeded = await seed();
    expect(await queuedRunAt(seeded)).toBeUndefined();
    const before = Date.now();
    expect(await sweepDue(deps)).toMatch(/^quarantined=0 enqueued=[1-9]/);
    const runAt = await queuedRunAt(seeded);
    expect(runAt?.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(runAt?.getTime()).toBeLessThanOrEqual(Date.now());
    expect((await destination(seeded)).state).toBe('scheduled');
  });

  it('keeps the run_at of an existing future job', async () => {
    const seeded = await seed();
    const later = Temporal.Now.instant().add({ minutes: 5 });
    await db.withTenant(workspaceId, SYSTEM, (trx) =>
      enqueuePublish(trx, { workspaceId, id: seeded.destinationId }, later),
    );
    await sweepDue(deps);
    expect((await queuedRunAt(seeded))?.getTime()).toBe(later.epochMilliseconds);
  });

  it('blocks past-due destinations under restore quarantine and leaves publishing ones', async () => {
    const waiting = await seed();
    const sending = await seed();
    await strand(sending, { sent: true });
    await owner.withActor(CLI, (trx) =>
      sql`
        insert into instance_state (instance_id, publishing_paused, paused_reason)
        values (gen_random_uuid(), true, 'restore_quarantine')
        on conflict (singleton) do update
          set publishing_paused = true, paused_reason = 'restore_quarantine'
      `.execute(trx),
    );
    try {
      expect(await sweepDue(deps)).toMatch(/^quarantined=[1-9]\d* enqueued=0$/);
      expect(await reapLeases(deps)).toBe('retry=0 verifying=0 failed=0 canceled=0');
    } finally {
      await owner.withActor(CLI, (trx) =>
        sql`update instance_state set publishing_paused = false, paused_reason = null`.execute(trx),
      );
    }
    expect(await destination(waiting)).toMatchObject({
      state: 'blocked',
      state_reason: 'restore_quarantine',
    });
    expect(await audits(waiting)).toMatchObject([
      { action: 'destination.blocked', error_code: 'restore_quarantine' },
    ]);
    expect(await queuedRunAt(waiting)).toBeUndefined();
    expect((await destination(sending)).state).toBe('publishing');
  });

  it('retries an interrupted destination that never sent and frees it for a re-claim', async () => {
    const seeded = await seed();
    const attemptId = await strand(seeded);
    await reapLeases(deps);
    const row = await destination(seeded);
    expect(row).toMatchObject({
      state: 'retry_wait',
      state_reason: 'interrupted_safe',
      lease_until: null,
    });
    expect((await queuedRunAt(seeded))?.getTime()).toBe(row.run_at?.getTime());
    const [attempt] = await attempts(seeded);
    expect(attempt).toMatchObject({ id: attemptId, outcome: 'interrupted' });
    expect(attempt?.finished_at).not.toBeNull();

    await updateDestination(seeded, sql`run_at = now() - interval '1 second'`);
    fake.script({ kind: 'publish', remoteId: 'r-again' });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      remote_id: 'r-again',
      attempt_count: 2,
    });
    expect((await attempts(seeded)).map((a) => [a.attempt_no, a.outcome])).toEqual([
      [1, 'interrupted'],
      [2, 'ok'],
    ]);
  });

  it('moves a destination that had sent to verification and still accepts the late finalize', async () => {
    const seeded = await seed();
    let reaped: Awaited<ReturnType<typeof destination>> | undefined;
    fake.script({
      kind: 'publish',
      remoteId: 'r-reaped',
      afterPublic: async () => {
        await updateDestination(seeded, sql`lease_until = now() - interval '60 seconds'`);
        await reapLeases(deps);
        reaped = await destination(seeded);
      },
    });
    await publish(seeded);
    const [attempt] = await attempts(seeded);
    expect(reaped).toMatchObject({
      state: 'verifying',
      state_reason: 'interrupted_after_send',
      lease_until: null,
      claimed_attempt_id: attempt?.id,
    });
    expect(attempt).toMatchObject({ outcome: 'ok', remote_id: 'r-reaped' });
    expect(attempt?.public_send_at).not.toBeNull();
    expect(await destination(seeded)).toMatchObject({
      state: 'published',
      resolution: 'api',
      remote_id: 'r-reaped',
      claimed_attempt_id: null,
    });
  });

  it('records a late failure on the attempt and keeps the reaped row verifying', async () => {
    const seeded = await seed();
    fake.script({
      kind: 'fail',
      error: { kind: 'permanent', code: 'rejected' },
      at: 'after_public',
      afterPublic: async () => {
        await updateDestination(seeded, sql`lease_until = now() - interval '60 seconds'`);
        await reapLeases(deps);
      },
    });
    await publish(seeded);
    expect(await destination(seeded)).toMatchObject({
      state: 'verifying',
      state_reason: 'interrupted_after_send',
    });
    expect((await attempts(seeded))[0]).toMatchObject({
      outcome: 'permanent',
      error_code: 'rejected',
    });
  });

  it('cancels an interrupted destination that never sent when a cancel was requested', async () => {
    const seeded = await seed();
    await strand(seeded);
    await updateDestination(seeded, sql`cancel_requested_at = now()`);
    expect(await reapLeases(deps)).toMatch(/canceled=[1-9]/);
    expect(await destination(seeded)).toMatchObject({
      state: 'canceled',
      state_reason: 'user_canceled',
    });
    expect((await audits(seeded)).map((a) => a.action)).toEqual(['destination.canceled']);
    expect(await queuedRunAt(seeded)).toBeUndefined();
  });

  it('fails an interrupted destination that used all its attempts', async () => {
    const seeded = await seed();
    const attemptId = await strand(seeded, { attemptCount: 6 });
    await reapLeases(deps);
    expect(await destination(seeded)).toMatchObject({
      state: 'failed',
      state_reason: 'attempts_exhausted',
      lease_until: null,
    });
    expect(await audits(seeded)).toMatchObject([
      {
        action: 'destination.failed',
        error_code: 'attempts_exhausted',
        correlation_id: attemptId,
      },
    ]);
    expect((await items(seeded))[0]?.state).toBe('pending');
    expect(await queuedRunAt(seeded)).toBeUndefined();
  });

  it('leaves a lease that expired within the grace period', async () => {
    const seeded = await seed();
    await strand(seeded, { expiredSeconds: 10 });
    await reapLeases(deps);
    expect((await destination(seeded)).state).toBe('publishing');
    expect((await attempts(seeded))[0]?.finished_at).toBeNull();
  });
});
