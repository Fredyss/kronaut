import { randomUUID } from 'node:crypto';
import type { StateReason } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import type { DestinationJob } from '../jobs.ts';
import { PROVIDER_EGRESS } from '../providers.ts';
import { applyPlan, type PlanContext } from './apply.ts';
import { currentItem, selectItems } from './chain.ts';
import { lockPost } from './lock.ts';
import { unconfirmedIfBlocked } from './plan.ts';
import type { PublishDeps } from './task.ts';
import type { DestinationRef } from './transition.ts';
import { recordedPlan } from './verify-decision.ts';
import { instant, type VerifyPrepared } from './verify-run.ts';
import { runBase, runTarget, type Verifier } from './verify-target.ts';

const UNCONFIRMED_REASONS: ReadonlySet<string> = new Set([
  'ambiguous_response',
  'interrupted_after_send',
]);
const IN_FLIGHT_SECONDS = PROVIDER_EGRESS.timeoutMs / 1000 + 30;

const DONE: VerifyPrepared = { kind: 'done' };

function selectVerifying(trx: TenantDb, job: DestinationJob) {
  return trx
    .selectFrom('post_destinations')
    .select([
      'state',
      'state_reason',
      'version',
      'provider',
      'publish_type',
      'social_account_id',
      'frozen_post_version',
      'attempt_count',
      'deadline_at',
      'claimed_attempt_id',
      'provider_state',
      sql<boolean>`run_at is null or run_at <= now()`.as('due'),
      sql<boolean>`exists (
        select 1 from destination_items i
         where i.workspace_id = post_destinations.workspace_id
           and i.destination_id = post_destinations.id
           and i.position = 0 and i.state = 'confirmed')`.as('main_confirmed'),
      sql<boolean>`instance_paused()`.as('paused'),
    ])
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', job.id)
    .forUpdate()
    .executeTakeFirst();
}

type VerifyRow = NonNullable<Awaited<ReturnType<typeof selectVerifying>>>;

interface Verifying {
  readonly postId: string;
  readonly dest: VerifyRow;
  readonly claimedAttemptId: string;
  readonly postVersion: number;
  readonly deadlineAt: Temporal.Instant | null;
}

function selectAttempt(trx: TenantDb, workspaceId: string, attemptId: string) {
  return trx
    .selectFrom('publish_attempts')
    .select([
      'attempt_no',
      'outcome',
      'error_code',
      'error_message',
      'retry_after',
      'remote_id',
      'remote_url',
      'anchor',
      'public_send_at',
      'started_at',
      'finished_at',
    ])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', attemptId)
    .executeTakeFirstOrThrow();
}

export interface VerifyScope extends Verifying {
  readonly deps: PublishDeps;
  readonly trx: TenantDb;
  readonly job: DestinationJob;
  readonly ref: DestinationRef;
  readonly attempt: Awaited<ReturnType<typeof selectAttempt>>;
  readonly account: {
    readonly id: string;
    readonly provider_app_id: string;
    readonly provider_account_id: string;
    readonly handle: string | null;
  };
  readonly context: PlanContext;
  readonly now: Temporal.Instant;
}

async function lockVerifying(trx: TenantDb, job: DestinationJob): Promise<Verifying | undefined> {
  const head = await trx
    .selectFrom('post_destinations')
    .select('post_id')
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', job.id)
    .executeTakeFirst();
  if (head === undefined) return undefined;
  if ((await lockPost(trx, job.workspaceId, head.post_id)) === undefined) return undefined;
  const dest = await selectVerifying(trx, job);
  if (dest === undefined || dest.state !== 'verifying' || dest.due !== true) return undefined;
  if (dest.paused) return undefined;
  const { claimed_attempt_id: claimedAttemptId, frozen_post_version: postVersion } = dest;
  if (claimedAttemptId === null || postVersion === null || dest.deadline_at === null) {
    throw new Error('a verifying destination has no claimed attempt, revision or deadline');
  }
  const inFlight = await trx
    .selectFrom('publish_attempts')
    .select('id')
    .where('workspace_id', '=', job.workspaceId)
    .where('destination_id', '=', job.id)
    .where('kind', '=', 'verify')
    .where('finished_at', 'is', null)
    .where('started_at', '>', sql<Date>`now() - make_interval(secs => ${IN_FLIGHT_SECONDS})`)
    .executeTakeFirst();
  if (inFlight !== undefined) return undefined;
  return {
    postId: head.post_id,
    dest,
    claimedAttemptId,
    postVersion,
    deadlineAt: dest.main_confirmed ? null : instant(dest.deadline_at),
  };
}

async function loadScope(
  deps: PublishDeps,
  trx: TenantDb,
  job: DestinationJob,
  verifying: Verifying,
): Promise<VerifyScope> {
  const { dest, claimedAttemptId } = verifying;
  const ref: DestinationRef = {
    workspaceId: job.workspaceId,
    id: job.id,
    postId: verifying.postId,
    postVersion: verifying.postVersion,
    socialAccountId: dest.social_account_id,
    version: dest.version,
  };
  const attempt = await selectAttempt(trx, job.workspaceId, claimedAttemptId);
  const account = await trx
    .selectFrom('social_accounts')
    .select(['id', 'provider_app_id', 'provider_account_id', 'handle'])
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', dest.social_account_id)
    .executeTakeFirstOrThrow();
  const context: PlanContext = {
    job,
    attemptId: claimedAttemptId,
    socialAccountId: account.id,
    providerAppId: account.provider_app_id,
    credential: { unchangedSince: attempt.started_at },
  };
  const now = deps.now();
  return { ...verifying, deps, trx, job, ref, attempt, account, context, now };
}

async function settleRecorded(scope: VerifyScope): Promise<boolean> {
  const { attempt } = scope;
  if (attempt.finished_at === null) return false;
  const recorded = recordedPlan(attempt, {
    afterPublic: attempt.public_send_at !== null,
    attemptCount: scope.dest.attempt_count,
    deadlineAt: scope.deadlineAt,
    now: scope.now,
    random: scope.deps.randomInt,
    asyncElapsedMs: null,
    asyncGiveUpAfterMs: null,
  });
  if (recorded === undefined || recorded.state === 'verifying') return false;
  await applyPlan(scope.trx, scope.context, scope.ref, unconfirmedIfBlocked(recorded));
  return true;
}

function unconfirmedReason(stateReason: string | null): StateReason {
  return stateReason !== null && UNCONFIRMED_REASONS.has(stateReason)
    ? (stateReason as StateReason)
    : 'ambiguous_response';
}

export async function openCheck(scope: VerifyScope) {
  const { deps, trx, job } = scope;
  const last = await trx
    .selectFrom('publish_attempts')
    .select((eb) => eb.fn.max('attempt_no').as('n'))
    .where('workspace_id', '=', job.workspaceId)
    .where('destination_id', '=', job.id)
    .executeTakeFirst();
  const verifyAttemptId = randomUUID();
  const current = currentItem(await selectItems(trx, job));
  await trx
    .insertInto('publish_attempts')
    .values({
      workspace_id: job.workspaceId,
      id: verifyAttemptId,
      destination_id: job.id,
      attempt_no: (last?.n ?? 0) + 1,
      kind: 'verify',
      worker_id: deps.workerId,
      post_version: scope.postVersion,
      counted: false,
      item_position: current?.position ?? null,
    })
    .execute();
  const checks = await trx
    .selectFrom('publish_attempts')
    .select((eb) => eb.fn.countAll<string>().as('n'))
    .where('workspace_id', '=', job.workspaceId)
    .where('destination_id', '=', job.id)
    .where('kind', '=', 'verify')
    .executeTakeFirstOrThrow();
  return { verifyAttemptId, checks };
}

export async function prepareIn(
  deps: PublishDeps,
  trx: TenantDb,
  job: DestinationJob,
): Promise<VerifyPrepared> {
  const verifying = await lockVerifying(trx, job);
  if (verifying === undefined) return DONE;
  const scope = await loadScope(deps, trx, job, verifying);
  if (await settleRecorded(scope)) return DONE;
  await trx
    .updateTable('publish_attempts')
    .set({ outcome: 'interrupted', finished_at: sql<Date>`now()` })
    .where('workspace_id', '=', job.workspaceId)
    .where('destination_id', '=', job.id)
    .where('finished_at', 'is', null)
    .execute();

  const { dest } = verifying;
  const entry = deps.providers.get(dest.provider);
  const poll = dest.state_reason === 'provider_processing' && entry?.runtime.poll !== undefined;
  if (entry !== undefined && !poll && entry.manifest.verify.mode === 'none') {
    const reason = unconfirmedReason(dest.state_reason);
    await applyPlan(trx, scope.context, scope.ref, {
      state: 'unconfirmed',
      reason,
      outcome: 'unconfirmed',
    });
    return DONE;
  }

  const check = await openCheck(scope);
  const postType = entry?.manifest.postTypes.find((spec) => spec.id === dest.publish_type);
  const verifier: Verifier = { entry, poll, postType };
  return await runTarget(scope, runBase(scope, check, verifier), verifier);
}
