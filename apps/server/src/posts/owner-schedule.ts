import type { ScopeUnit } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { openApprovalRequest } from '../approvals/request.ts';
import { HttpError } from '../http/errors.ts';
import type { ProviderRegistry } from '../providers.ts';
import { approvalStatus } from '../publish/principal.ts';
import { type CurrentPost, lockDestinations } from './locks.ts';
import type { OwnerActing } from './owner.ts';
import { authorizeSchedule, scheduleLocked } from './schedule.ts';

export interface OwnerEnv {
  readonly providers: ProviderRegistry;
  readonly now: Temporal.Instant;
  readonly workspaceId: string;
}

export interface OwnerTurn {
  readonly env: OwnerEnv;
  readonly acting: OwnerActing;
  readonly locked: CurrentPost;
  readonly units: readonly ScopeUnit[];
}

export interface LocalAt {
  readonly scheduleLocal: string;
  readonly scheduleTz: string;
}

export async function scheduleAsOwner(trx: TenantDb, turn: OwnerTurn, at: LocalAt) {
  const { env, locked, units, acting } = turn;
  const { workspaceId } = env;
  const auth = await authorizeSchedule(trx, acting, { workspaceId, locked, units });
  const rows = await lockDestinations(trx, workspaceId, locked.id);
  const body = { mode: 'instant' as const, expectedVersion: locked.version, ...at };
  const run = { providers: env.providers, now: env.now, workspaceId, locked, auth, body };
  await scheduleLocked(trx, run, rows);
  return 'scheduled' as const;
}

export async function requestAsOwner(trx: TenantDb, turn: OwnerTurn, at: LocalAt) {
  const { env, locked, units, acting } = turn;
  acting.authorize('posts:submit', { workspaceId: env.workspaceId, postId: locked.id, units });
  await openApprovalRequest(trx, acting, {
    providers: env.providers,
    workspaceId: env.workspaceId,
    locked,
    schedule: at,
    note: undefined,
  });
  return 'requested' as const;
}

// An approval covers the content and time it was given for (ADR-0011); after an edit the owner asks again.
export async function scheduleOrRequest(trx: TenantDb, turn: OwnerTurn, at: LocalAt) {
  await sql`savepoint owner_schedule`.execute(trx);
  try {
    const outcome = await scheduleAsOwner(trx, turn, at);
    await sql`release savepoint owner_schedule`.execute(trx);
    return outcome;
  } catch (err) {
    if (!(err instanceof HttpError) || err.code !== 'approval_required') throw err;
    await sql`rollback to savepoint owner_schedule`.execute(trx);
    return await requestAsOwner(trx, turn, at);
  }
}

export async function needsRequest(
  trx: TenantDb,
  turn: OwnerTurn,
  agentDirty: boolean,
): Promise<boolean> {
  const { env, locked, units, acting } = turn;
  const approval = await approvalStatus(trx, env.workspaceId, locked, null);
  const resource = { workspaceId: env.workspaceId, postId: locked.id, units };
  const decision = acting.decide('posts:schedule', resource, approval);
  return decision.kind === 'require_approval' || agentDirty;
}

export async function newestRequest(trx: TenantDb, workspaceId: string, postId: string) {
  return await trx
    .selectFrom('approval_requests')
    .select(['id', 'state'])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(1)
    .executeTakeFirst();
}
