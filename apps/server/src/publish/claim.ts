import { createHash, randomUUID } from 'node:crypto';
import type { DestinationState, PostTypeSpec, PublishInput, PublishItem } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { type DestinationJob, enqueuePublish } from '../jobs.ts';
import type { ProviderEntry } from '../providers.ts';
import { type ClaimAccount, checkAccess, checkContent, type Inputs } from './claim-checks.ts';
import { publishInput } from './input.ts';
import { type LockedPost, lockPost, SYSTEM } from './lock.ts';
import type { PublishDeps } from './task.ts';
import type { DestinationRef } from './transition.ts';

const CLAIMABLE = ['scheduled', 'retry_wait'] as const;
const BUSY_RETRY_MIN_MS = 15_000;
const BUSY_RETRY_MAX_MS = 30_000;

export interface Claimed {
  readonly job: DestinationJob;
  readonly postId: string;
  readonly postVersion: number;
  readonly socialAccountId: string;
  readonly providerAppId: string;
  readonly credential: { readonly id: string; readonly version: number };
  readonly attemptId: string;
  readonly attemptNo: number;
  readonly attemptCount: number;
  readonly deadlineAt: Temporal.Instant;
  readonly afterRefresh: boolean;
  readonly entry: ProviderEntry;
  readonly postType: PostTypeSpec;
  readonly items: readonly PublishItem[];
  readonly input: PublishInput<unknown, unknown>;
}

export type ClaimResult =
  | { readonly kind: 'noop' }
  | { readonly kind: 'settled'; readonly state: DestinationState }
  | { readonly kind: 'busy' }
  | { readonly kind: 'claimed'; readonly claimed: Claimed };

const NOOP: ClaimResult = { kind: 'noop' };

function selectClaimable(trx: TenantDb, job: DestinationJob) {
  return trx
    .selectFrom('post_destinations')
    .select([
      'state',
      'state_reason',
      'version',
      'provider',
      'publish_type',
      'delivery_mode',
      'social_account_id',
      'frozen_post_version',
      'deadline_at',
      'scheduled_by_user_id',
      'scheduled_by_grant_id',
      'approval_request_id',
      'preflight_acked_codes',
      'attempt_count',
      'provider_state',
      sql<boolean>`run_at <= now()`.as('due'),
      sql<boolean>`deadline_at < now()`.as('late'),
      sql<boolean>`instance_paused()`.as('paused'),
    ])
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', job.id)
    .forUpdate()
    .executeTakeFirst();
}

export type ClaimRow = NonNullable<Awaited<ReturnType<typeof selectClaimable>>>;

interface Claimable {
  readonly post: LockedPost;
  readonly dest: ClaimRow;
  readonly postVersion: number;
  readonly deadlineAt: Date;
}

export interface ClaimScope extends Claimable {
  readonly deps: PublishDeps;
  readonly trx: TenantDb;
  readonly job: DestinationJob;
  readonly ref: DestinationRef;
}

function sha256(text: string): Buffer {
  return createHash('sha256').update(text, 'utf8').digest();
}

function isBusy(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const { code, constraint } = err as { code?: unknown; constraint?: unknown };
  return code === '23505' && constraint === 'ux_dest_inflight';
}

function instant(date: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

async function lockClaimable(trx: TenantDb, job: DestinationJob): Promise<Claimable | undefined> {
  const head = await trx
    .selectFrom('post_destinations')
    .select('post_id')
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', job.id)
    .executeTakeFirst();
  if (head === undefined) return undefined;
  const post = await lockPost(trx, job.workspaceId, head.post_id);
  if (post === undefined) return undefined;
  const dest = await selectClaimable(trx, job);
  if (dest === undefined) return undefined;
  if (!(CLAIMABLE as readonly string[]).includes(dest.state) || dest.due !== true) return undefined;
  if (dest.paused) return undefined;
  const { frozen_post_version: postVersion, deadline_at: deadlineAt } = dest;
  if (postVersion === null || deadlineAt === null) {
    throw new Error('a claimable destination has no frozen revision or deadline');
  }
  return { post, dest, postVersion, deadlineAt };
}

async function casClaim(scope: ClaimScope, attemptId: string, counted: boolean) {
  const { trx, job, dest } = scope;
  return await trx
    .updateTable('post_destinations')
    .set({
      state: 'publishing',
      state_reason: null,
      version: dest.version + 1,
      lease_until: sql<Date>`now() + interval '120 seconds'`,
      claimed_attempt_id: attemptId,
      attempt_count: counted ? dest.attempt_count + 1 : dest.attempt_count,
    })
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', job.id)
    .where('state', 'in', CLAIMABLE)
    .where('version', '=', dest.version)
    .where('run_at', '<=', sql<Date>`now()`)
    .returning('attempt_count')
    .executeTakeFirst();
}

async function insertAttempt(
  scope: ClaimScope,
  attemptId: string,
  counted: boolean,
): Promise<number> {
  const { deps, trx, job } = scope;
  const last = await trx
    .selectFrom('publish_attempts')
    .select((eb) => eb.fn.max('attempt_no').as('n'))
    .where('workspace_id', '=', job.workspaceId)
    .where('destination_id', '=', job.id)
    .executeTakeFirst();
  const attemptNo = (last?.n ?? 0) + 1;
  await trx
    .insertInto('publish_attempts')
    .values({
      workspace_id: job.workspaceId,
      id: attemptId,
      destination_id: job.id,
      attempt_no: attemptNo,
      kind: 'publish',
      worker_id: deps.workerId,
      post_version: scope.postVersion,
      counted,
    })
    .execute();
  return attemptNo;
}

async function resetItems(scope: ClaimScope, items: readonly PublishItem[]): Promise<void> {
  const { trx, job } = scope;
  const existingItem = await trx
    .selectFrom('destination_items')
    .select('position')
    .where('workspace_id', '=', job.workspaceId)
    .where('destination_id', '=', job.id)
    .executeTakeFirst();
  if (existingItem !== undefined) {
    await trx
      .updateTable('destination_items')
      .set({ state: 'pending' })
      .where('workspace_id', '=', job.workspaceId)
      .where('destination_id', '=', job.id)
      .where('state', 'in', ['sending', 'unconfirmed', 'failed', 'skipped'])
      .execute();
  } else {
    await trx
      .insertInto('destination_items')
      .values(
        items.map((item) => {
          const text = item.text.normalize('NFC');
          return {
            workspace_id: job.workspaceId,
            destination_id: job.id,
            position: item.position,
            role: item.role,
            rendered_text: text,
            rendered_sha256: sha256(text),
          };
        }),
      )
      .execute();
  }
}

async function claimAttempt(
  scope: ClaimScope,
  account: ClaimAccount,
  inputs: Inputs,
): Promise<ClaimResult> {
  const { job, post, dest } = scope;
  const { entry, prepared } = inputs;
  const { items, postType } = prepared;
  const counted = !(dest.state === 'retry_wait' && dest.state_reason === 'provider_processing');
  const attemptId = randomUUID();
  const cas = await casClaim(scope, attemptId, counted);
  if (cas === undefined) return NOOP;
  const attemptNo = await insertAttempt(scope, attemptId, counted);
  await resetItems(scope, items);

  return {
    kind: 'claimed',
    claimed: {
      job,
      postId: post.id,
      postVersion: scope.postVersion,
      socialAccountId: account.id,
      providerAppId: account.provider_app_id,
      credential: prepared.credential,
      attemptId,
      attemptNo,
      attemptCount: cas.attempt_count,
      deadlineAt: instant(scope.deadlineAt),
      afterRefresh: dest.state === 'retry_wait' && dest.state_reason === 'auth_refreshed',
      entry,
      postType,
      items,
      input: publishInput({
        destinationId: job.id,
        attemptNo,
        publishType: dest.publish_type,
        account,
        ready: prepared,
        state: dest.provider_state,
      }),
    },
  };
}

async function claimIn(
  deps: PublishDeps,
  trx: TenantDb,
  job: DestinationJob,
): Promise<ClaimResult> {
  const claimable = await lockClaimable(trx, job);
  if (claimable === undefined) return NOOP;
  const { post, dest, postVersion } = claimable;
  const ref: DestinationRef = {
    workspaceId: job.workspaceId,
    id: job.id,
    postId: post.id,
    postVersion,
    socialAccountId: dest.social_account_id,
    version: dest.version,
  };
  const scope: ClaimScope = { ...claimable, deps, trx, job, ref };
  const access = await checkAccess(scope);
  if (access.kind !== 'access') return access;
  const inputs = await checkContent(scope, access.account);
  if (inputs.kind !== 'inputs') return inputs;
  return await claimAttempt(scope, access.account, inputs);
}

export async function claim(deps: PublishDeps, job: DestinationJob): Promise<ClaimResult> {
  try {
    return await deps.db.withTenant(job.workspaceId, SYSTEM, (trx) => claimIn(deps, trx, job));
  } catch (err) {
    if (!isBusy(err)) throw err;
  }
  const delay = deps.randomInt(BUSY_RETRY_MIN_MS, BUSY_RETRY_MAX_MS + 1);
  await deps.db.withTenant(job.workspaceId, SYSTEM, (trx) =>
    enqueuePublish(trx, job, deps.now().add({ milliseconds: delay })),
  );
  return { kind: 'busy' };
}
