import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { applyPlan, toDate } from './apply.ts';
import type { Claimed } from './claim.ts';
import { lockPost, SYSTEM } from './lock.ts';
import { type Plan, plan, type RunResult } from './plan.ts';
import type { PublishDeps } from './task.ts';
import type { DestinationRef } from './transition.ts';

export { type DestinationRef, type DestinationUpdate, transition } from './transition.ts';

const FINALIZE_TRIES = 3;
const RETRYABLE_SQLSTATES: ReadonlySet<string> = new Set(['40P01', '40001']);

interface FinalizeRun {
  readonly deps: PublishDeps;
  readonly claimed: Claimed;
  readonly result: RunResult;
  readonly trx: TenantDb;
}

interface LockedRow {
  readonly state: string;
  readonly claimed_attempt_id: string | null;
}

async function asyncElapsedMs(
  trx: TenantDb,
  claimed: Claimed,
  now: Temporal.Instant,
): Promise<number | null> {
  const { workspaceId, id } = claimed.job;
  const row = await trx
    .selectFrom('publish_attempts')
    .select((eb) => eb.fn.min('started_at').as('started_at'))
    .where('workspace_id', '=', workspaceId)
    .where('destination_id', '=', id)
    .where('attempt_no', '>=', (eb) =>
      eb
        .selectFrom('publish_attempts')
        .select((inner) => inner.fn.max('attempt_no').as('n'))
        .where('workspace_id', '=', workspaceId)
        .where('destination_id', '=', id)
        .where('counted', '=', true),
    )
    .executeTakeFirst();
  const startedAt = row?.started_at;
  if (startedAt === null || startedAt === undefined) return null;
  return now.epochMilliseconds - new Date(startedAt).getTime();
}

function honourCancel(planned: Plan): Plan {
  if (
    planned.state === 'published' ||
    planned.state === 'verifying' ||
    planned.state === 'canceled'
  ) {
    return planned;
  }
  return {
    state: 'canceled',
    reason: 'user_canceled',
    outcome: planned.outcome,
    ...(planned.sideEffect === undefined ? {} : { sideEffect: planned.sideEffect }),
  };
}

async function planFor(run: FinalizeRun, afterPublic: boolean): Promise<Plan> {
  const { deps, claimed, result, trx } = run;
  const now = deps.now();
  const giveUpAfterMs = claimed.postType.async?.giveUpAfterMs ?? null;
  return plan(result, {
    afterPublic,
    attemptCount: claimed.attemptCount,
    deadlineAt: claimed.deadlineAt,
    now,
    random: deps.randomInt,
    asyncElapsedMs:
      result.kind === 'pending' && giveUpAfterMs !== null
        ? await asyncElapsedMs(trx, claimed, now)
        : null,
    asyncGiveUpAfterMs: giveUpAfterMs,
  });
}

async function recordAttempt(trx: TenantDb, claimed: Claimed, planned: Plan): Promise<void> {
  await trx
    .updateTable('publish_attempts')
    .set({
      outcome: planned.outcome,
      finished_at: sql<Date>`now()`,
      error_code: planned.errorCode ?? null,
      error_message: planned.errorMessage ?? null,
      http_status: null,
      provider_request_id: null,
      retry_after: planned.retryAfter === undefined ? null : toDate(planned.retryAfter),
      remote_id: planned.remoteId ?? null,
      remote_url: planned.remoteUrl ?? null,
    })
    .where('workspace_id', '=', claimed.job.workspaceId)
    .where('id', '=', claimed.attemptId)
    .execute();
}

function movedOn(deps: PublishDeps, claimed: Claimed, dest: LockedRow, planned: Plan): boolean {
  const late =
    planned.state === 'published' && (dest.state === 'verifying' || dest.state === 'unconfirmed');
  if (dest.claimed_attempt_id === claimed.attemptId && (dest.state === 'publishing' || late)) {
    return false;
  }
  if (planned.state === 'published' && dest.state !== 'published') {
    deps.logger.error(
      { destinationId: claimed.job.id, attemptId: claimed.attemptId, remoteId: planned.remoteId },
      'a late publish arrived after the destination moved on',
    );
  }
  return true;
}

async function finalizeIn(
  deps: PublishDeps,
  claimed: Claimed,
  result: RunResult,
  trx: TenantDb,
): Promise<void> {
  const { workspaceId, id } = claimed.job;
  await lockPost(trx, workspaceId, claimed.postId);
  const dest = await trx
    .selectFrom('post_destinations')
    .select(['state', 'claimed_attempt_id', 'version', 'cancel_requested_at'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', id)
    .forUpdate()
    .executeTakeFirst();
  const attempt = await trx
    .selectFrom('publish_attempts')
    .select(['public_send_at', 'finished_at'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', claimed.attemptId)
    .executeTakeFirstOrThrow();
  const planned = await planFor({ deps, claimed, result, trx }, attempt.public_send_at !== null);
  if (attempt.finished_at === null) await recordAttempt(trx, claimed, planned);

  if (dest === undefined || movedOn(deps, claimed, dest, planned)) return;
  const ref: DestinationRef = {
    workspaceId,
    id,
    postId: claimed.postId,
    postVersion: claimed.postVersion,
    socialAccountId: claimed.socialAccountId,
    version: dest.version,
  };
  await applyPlan(
    trx,
    claimed,
    ref,
    dest.cancel_requested_at !== null && attempt.public_send_at === null
      ? honourCancel(planned)
      : planned,
  );
}

// A refused public step was never sent; closing the attempt keeps ux_attempt_open free for the next claim.
export async function closeAttempt(deps: PublishDeps, claimed: Claimed): Promise<void> {
  await deps.db.withTenant(claimed.job.workspaceId, SYSTEM, (trx) =>
    trx
      .updateTable('publish_attempts')
      .set({ outcome: 'retry_not_sent', finished_at: sql<Date>`now()` })
      .where('workspace_id', '=', claimed.job.workspaceId)
      .where('id', '=', claimed.attemptId)
      .where('finished_at', 'is', null)
      .where('public_send_at', 'is', null)
      .execute(),
  );
}

function sqlState(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const code: unknown = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

export async function finalize(
  deps: PublishDeps,
  claimed: Claimed,
  result: RunResult,
): Promise<void> {
  for (let tries = 1; ; tries++) {
    try {
      await deps.db.withTenant(claimed.job.workspaceId, SYSTEM, (trx) =>
        finalizeIn(deps, claimed, result, trx),
      );
      return;
    } catch (err) {
      const state = sqlState(err);
      if (tries >= FINALIZE_TRIES || state === undefined || !RETRYABLE_SQLSTATES.has(state)) {
        throw err;
      }
      deps.logger.warn({ destinationId: claimed.job.id, sqlState: state }, 'finalize retried');
    }
  }
}
