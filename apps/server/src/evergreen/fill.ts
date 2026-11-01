import { randomUUID } from 'node:crypto';
import { encodePublicId } from '@kronaut/core';
import type { Actor, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { HttpError } from '../http/errors.ts';
import { type JobDeps, sweepCron } from '../jobs/workspace-sweep.ts';
import { actAs, type Owned, OwnerLost } from '../posts/owner.ts';
import type { OwnerEnv } from '../posts/owner-schedule.ts';
import { freeSlots, lockQueues } from '../queue/slots.ts';
import { fillSlot } from './copy.ts';
import { type ChannelScope, claimedSlots, eligiblePool, poolChannels, untilOf } from './pool.ts';
import { settleCopy, voidMissed, waitingCopies } from './revisit.ts';

const TASK = 'evergreen_fill';
const MAX_SLOTS = 100;
const SYSTEM: Actor = { kind: 'system' };

export type FillDeps = JobDeps;

type Counts = Record<
  'channels' | 'slots' | 'scheduled' | 'requested' | 'voided' | 'removed' | 'failed',
  number
>;

interface Run {
  readonly deps: FillDeps;
  readonly now: Temporal.Instant;
  readonly counts: Counts;
}

interface Channel {
  readonly workspaceId: string;
  readonly accountId: string;
}

type RemoveReason = 'owner_lost' | 'copy_failed';

// A client error repeats every hour until someone changes the pool post, so retrying only fails again.
const CONTENT_ERRORS: ReadonlySet<string> = new Set([
  'invalid_request',
  'unprocessable',
  'preflight_failed',
]);

function removeReason(err: unknown): RemoveReason | null {
  if (err instanceof OwnerLost) return 'owner_lost';
  if (err instanceof HttpError && CONTENT_ERRORS.has(err.code)) return 'copy_failed';
  return null;
}

async function remove(trx: TenantDb, channel: Channel, pool: { post_id: string }, err: unknown) {
  const reason = removeReason(err);
  if (reason === null) return false;
  const { workspaceId } = channel;
  await trx
    .updateTable('evergreen_posts')
    .set({ state: 'removed', state_reason: reason, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', pool.post_id)
    .execute();
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: workspaceId,
      actor_kind: 'system',
      surface: 'worker',
      action: 'evergreen.removed',
      resource_kind: 'evergreen_post',
      resource_id: pool.post_id,
      post_id: pool.post_id,
      outcome: 'ok',
      error_code: err instanceof HttpError ? err.code : reason,
      args_summary: JSON.stringify({ reason }),
      correlation_id: randomUUID(),
    })
    .execute();
  return true;
}

type Outcome = 'scheduled' | 'requested' | 'idle';

interface Work {
  readonly pool: Owned & { readonly post_id: string };
  act(env: OwnerEnv): Promise<Outcome>;
}

// One pool post that cannot be copied must not roll back, and so block, the other slots.
async function isolated(trx: TenantDb, run: Run, channel: Channel, work: Work) {
  const { pool } = work;
  const env = { providers: run.deps.providers, now: run.now, workspaceId: channel.workspaceId };
  await sql`savepoint evergreen_slot`.execute(trx);
  try {
    const outcome = await work.act(env);
    if (outcome !== 'idle') run.counts[outcome]++;
    await sql`release savepoint evergreen_slot`.execute(trx);
    await actAs(trx, SYSTEM);
  } catch (err) {
    await sql`rollback to savepoint evergreen_slot`.execute(trx);
    await actAs(trx, SYSTEM);
    const log = {
      task: TASK,
      post: encodePublicId('post', pool.post_id),
      channel: encodePublicId('socialAccount', channel.accountId),
    };
    if (await remove(trx, channel, pool, err)) {
      run.counts.removed++;
      run.deps.logger.warn(log, 'an evergreen post left the pool');
    } else {
      run.counts.failed++;
      run.deps.logger.error(log, 'an evergreen copy could not be made');
    }
  }
}

async function settleWaiting(trx: TenantDb, run: Run, channel: Channel, scope: ChannelScope) {
  run.counts.voided += await voidMissed(trx, scope);
  for (const copy of await waitingCopies(trx, scope)) {
    await isolated(trx, run, channel, { pool: copy, act: (env) => settleCopy(trx, env, copy) });
  }
}

async function fillChannel(trx: TenantDb, run: Run, channel: Channel): Promise<void> {
  await lockQueues(trx, [channel.accountId]);
  const scope = { ...channel, now: run.now };
  await settleWaiting(trx, run, channel, scope);
  const ref = { ...scope, postId: null, until: untilOf(run.now) };
  const { free } = await freeSlots(trx, ref, MAX_SLOTS);
  const claimed = await claimedSlots(trx, scope, free);
  const open = free.filter((slot) => !claimed.has(slot.at.epochMilliseconds));
  if (open.length === 0) return;
  const pool = await eligiblePool(trx, scope, open.length);
  run.counts.slots += open.length;
  for (const [index, row] of pool.entries()) {
    const slot = open[index];
    if (slot === undefined) continue;
    const { accountId } = channel;
    const act = (env: OwnerEnv) => fillSlot(trx, { env, accountId, slot, pool: row });
    await isolated(trx, run, channel, { pool: row, act });
  }
}

async function fillWorkspace(run: Run, workspaceId: string): Promise<void> {
  const channels = await run.deps.db.withTenant(workspaceId, SYSTEM, (trx) =>
    poolChannels(trx, workspaceId),
  );
  for (const accountId of channels) {
    run.counts.channels++;
    try {
      await run.deps.db.withTenant(workspaceId, SYSTEM, (trx) =>
        fillChannel(trx, run, { workspaceId, accountId }),
      );
    } catch {
      run.counts.failed++;
      run.deps.logger.error(
        { task: TASK, channel: encodePublicId('socialAccount', accountId) },
        'evergreen fill failed for a channel',
      );
    }
  }
}

export async function fillEvergreen(deps: FillDeps): Promise<string> {
  const counts: Counts = {
    channels: 0,
    slots: 0,
    scheduled: 0,
    requested: 0,
    voided: 0,
    removed: 0,
    failed: 0,
  };
  const run: Run = { deps, now: deps.now(), counts };
  return await sweepCron(deps, TASK, counts, (workspaceId) => fillWorkspace(run, workspaceId));
}
