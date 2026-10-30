import { toDate } from '@kronaut/core';
import type { SweepRow, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { enqueuePublish, enqueueVerify, ensurePublishJob, ensureVerifyJob } from '../jobs.ts';
import { currentLaterItem, failedReason, failLaterItem } from './chain-step.ts';
import { lockPost, SYSTEM } from './lock.ts';
import { firstCheckAt, retry } from './plan.ts';
import type { PublishDeps } from './task.ts';
import { auditTransition, type DestinationRef, transition } from './transition.ts';

export type SweepDeps = Pick<PublishDeps, 'db' | 'logger' | 'now' | 'randomInt'>;

const SWEEP_LIMIT = 500;
const WAITING = ['scheduled', 'retry_wait'];

async function lockDestination(trx: TenantDb, row: SweepRow) {
  const { workspaceId, id } = row;
  const head = await trx
    .selectFrom('post_destinations')
    .select('post_id')
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', id)
    .executeTakeFirst();
  if (head === undefined) return undefined;
  if ((await lockPost(trx, workspaceId, head.post_id)) === undefined) return undefined;
  const dest = await trx
    .selectFrom('post_destinations')
    .select([
      'state',
      'version',
      'social_account_id',
      'frozen_post_version',
      'attempt_count',
      'deadline_at',
      'claimed_attempt_id',
      'cancel_requested_at',
      'run_at',
      sql<boolean>`run_at <= now()`.as('due'),
      sql<boolean>`lease_until < now() - interval '30 seconds'`.as('expired'),
      sql<boolean>`instance_paused()`.as('paused'),
    ])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', id)
    .forUpdate()
    .executeTakeFirst();
  if (dest === undefined) return undefined;
  const ref: DestinationRef = {
    workspaceId,
    id,
    postId: head.post_id,
    postVersion: dest.frozen_post_version,
    socialAccountId: dest.social_account_id,
    version: dest.version,
  };
  return { ref, dest };
}

type Locked = NonNullable<Awaited<ReturnType<typeof lockDestination>>>;

async function sweepRows<T>(
  deps: SweepDeps,
  task: string,
  rows: readonly SweepRow[],
  handle: (trx: TenantDb, locked: Locked) => Promise<T | undefined>,
): Promise<T[]> {
  const handled: T[] = [];
  for (const row of rows) {
    try {
      const result = await deps.db.withTenant(row.workspaceId, SYSTEM, async (trx) => {
        const locked = await lockDestination(trx, row);
        return locked === undefined ? undefined : await handle(trx, locked);
      });
      if (result !== undefined) handled.push(result);
    } catch (err) {
      deps.logger.error({ err, task, destinationId: row.id }, 'sweep failed for a destination');
    }
  }
  return handled;
}

async function quarantine(deps: SweepDeps): Promise<number> {
  const rows = await deps.db.sweeps.quarantineDestinations(SWEEP_LIMIT);
  const blocked = await sweepRows(deps, 'publish_due_sweep', rows, async (trx, { ref, dest }) => {
    if (!WAITING.includes(dest.state) || dest.due !== true || dest.paused !== true) {
      return undefined;
    }
    await transition(trx, ref, { state: 'blocked', reason: 'restore_quarantine' });
    await auditTransition(trx, ref, { state: 'blocked', reason: 'restore_quarantine' }, null);
    return true;
  });
  if (blocked.length > 0) {
    deps.logger.error(
      { count: blocked.length },
      'destinations blocked by restore quarantine; the operator must release the instance',
    );
  }
  return blocked.length;
}

async function enqueueDue(deps: SweepDeps): Promise<number> {
  const rows = await deps.db.sweeps.dueDestinations(SWEEP_LIMIT);
  const enqueued = await sweepRows(deps, 'publish_due_sweep', rows, async (trx, { ref, dest }) => {
    if (!WAITING.includes(dest.state) || dest.due !== true || dest.paused === true) {
      return undefined;
    }
    await ensurePublishJob(trx, { workspaceId: ref.workspaceId, id: ref.id });
    return true;
  });
  return enqueued.length;
}

export async function sweepDue(deps: SweepDeps): Promise<string> {
  const quarantined = await quarantine(deps);
  const enqueued = await enqueueDue(deps);
  return `quarantined=${quarantined} enqueued=${enqueued}`;
}

async function reapSent(deps: SweepDeps, trx: TenantDb, ref: DestinationRef): Promise<'verifying'> {
  const { workspaceId, id } = ref;
  const runAt = firstCheckAt(deps.now(), deps.randomInt);
  await transition(trx, ref, {
    state: 'verifying',
    reason: 'interrupted_after_send',
    set: { lease_until: null, run_at: toDate(runAt) },
  });
  await enqueueVerify(trx, { workspaceId, id }, runAt);
  return 'verifying';
}

async function reap(
  deps: SweepDeps,
  trx: TenantDb,
  { ref, dest }: Locked,
): Promise<'retry' | 'verifying' | 'failed' | 'canceled' | undefined> {
  if (dest.state !== 'publishing' || dest.expired !== true || dest.paused === true) {
    return undefined;
  }
  if (dest.claimed_attempt_id === null || dest.deadline_at === null) {
    throw new Error('a publishing destination has no claimed attempt or deadline');
  }
  const { workspaceId, id } = ref;
  const attemptId = dest.claimed_attempt_id;
  const attempt = await trx
    .selectFrom('publish_attempts')
    .select(['public_send_at', 'finished_at'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', attemptId)
    .executeTakeFirst();
  const sent = (attempt?.public_send_at ?? null) !== null;
  if (sent) return await reapSent(deps, trx, ref);
  if (attempt !== undefined && attempt.finished_at === null) {
    await trx
      .updateTable('publish_attempts')
      .set({ outcome: 'interrupted', finished_at: sql<Date>`now()` })
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', attemptId)
      .where('finished_at', 'is', null)
      .execute();
  }

  if (dest.cancel_requested_at !== null) {
    await transition(trx, ref, {
      state: 'canceled',
      reason: 'user_canceled',
      set: { lease_until: null },
    });
    await trx
      .updateTable('destination_items')
      .where('workspace_id', '=', workspaceId)
      .where('destination_id', '=', id)
      .set({ state: 'skipped' })
      .where('state', '=', 'pending')
      .execute();
    await auditTransition(trx, ref, { state: 'canceled', reason: 'user_canceled' }, attemptId);
    return 'canceled';
  }

  return await reapUnsent(deps, trx, { ref, dest }, attemptId);
}

async function reapUnsent(
  deps: SweepDeps,
  trx: TenantDb,
  { ref, dest }: Locked,
  attemptId: string,
): Promise<'retry' | 'failed'> {
  const { workspaceId, id } = ref;
  const later = await currentLaterItem(trx, { workspaceId, id });
  const deadline =
    dest.deadline_at === null || later !== undefined ? null : dest.deadline_at.getTime();
  const retried = retry('interrupted_safe', 'interrupted', {
    afterPublic: false,
    attemptCount: dest.attempt_count,
    deadlineAt: deadline === null ? null : Temporal.Instant.fromEpochMilliseconds(deadline),
    now: deps.now(),
    random: deps.randomInt,
    asyncElapsedMs: null,
    asyncGiveUpAfterMs: null,
  });
  const planned =
    retried.state === 'failed'
      ? { ...retried, reason: failedReason(retried.reason, later) }
      : retried;
  await transition(trx, ref, {
    state: planned.state,
    reason: planned.reason,
    set: {
      lease_until: null,
      ...(planned.runAt === undefined ? {} : { run_at: toDate(planned.runAt) }),
    },
  });
  if (planned.state === 'retry_wait' && planned.runAt !== undefined) {
    await enqueuePublish(trx, { workspaceId, id }, planned.runAt);
    return 'retry';
  }
  if (later === undefined) {
    await trx
      .updateTable('destination_items')
      .set({ state: 'failed' })
      .where('workspace_id', '=', workspaceId)
      .where('destination_id', '=', id)
      .where('state', '=', 'sending')
      .execute();
  } else {
    await failLaterItem(trx, { workspaceId, id }, later);
  }
  await auditTransition(trx, ref, planned, attemptId);
  return 'failed';
}

export async function reapLeases(deps: SweepDeps): Promise<string> {
  const rows = await deps.db.sweeps.expiredLeases(SWEEP_LIMIT);
  const reaped = await sweepRows(deps, 'publish_lease_reaper', rows, (trx, locked) =>
    reap(deps, trx, locked),
  );
  const count = (kind: string) => reaped.filter((result) => result === kind).length;
  return `retry=${count('retry')} verifying=${count('verifying')} failed=${count('failed')} canceled=${count('canceled')}`;
}

export async function reconcile(deps: SweepDeps): Promise<string> {
  const rows = await deps.db.sweeps.verifyingDestinations(SWEEP_LIMIT);
  const ensured = await sweepRows(deps, 'publish_reconcile', rows, async (trx, { ref, dest }) => {
    if (dest.state !== 'verifying' || dest.paused === true) return undefined;
    const now = deps.now();
    const runAt =
      dest.run_at === null || dest.run_at.getTime() < now.epochMilliseconds
        ? now
        : Temporal.Instant.fromEpochMilliseconds(dest.run_at.getTime());
    await ensureVerifyJob(trx, { workspaceId: ref.workspaceId, id: ref.id }, runAt);
    return true;
  });
  return `ensured=${ensured.length}`;
}
