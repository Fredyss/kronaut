import { randomUUID } from 'node:crypto';
import { canTransition, type DestinationState, type ScopeUnit } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { auditActor, writeDestinationAudit } from '../audit/write.ts';
import { HttpError } from '../http/errors.ts';
import { pathId } from '../http/params.ts';
import type { RequestContext } from '../http/types.ts';
import {
  type CurrentPost,
  type LockedDestination,
  lockCurrent,
  lockDestinations,
  type PostRef,
} from '../posts/locks.ts';
import { postUnits } from '../posts/units.ts';

export const NEEDS_ACTION = ['unconfirmed', 'failed', 'blocked', 'awaiting_manual'] as const;

export const DestinationParams = z.object({
  workspaceId: z.string(),
  postId: z.string(),
  destinationId: z.string(),
});

type Params = z.output<typeof DestinationParams>;

export interface LockedTarget extends PostRef {
  readonly locked: CurrentPost;
  readonly units: readonly ScopeUnit[];
}

export interface Move {
  readonly destinationId: string;
  readonly expectedVersion: number;
  readonly to: DestinationState;
  readonly from: ReadonlySet<DestinationState>;
}

export function movableTo(to: DestinationState): ReadonlySet<DestinationState> {
  return new Set(NEEDS_ACTION.filter((state) => canTransition(state, to)));
}

export async function lockTarget(trx: TenantDb, params: Params): Promise<LockedTarget> {
  const workspaceId = pathId('workspace', params.workspaceId);
  const postId = pathId('post', params.postId);
  const locked = await lockCurrent(trx, workspaceId, postId);
  const units = await postUnits(trx, workspaceId, locked);
  return { workspaceId, postId, locked, units };
}

export interface Moving {
  readonly row: LockedDestination;
  readonly rows: readonly LockedDestination[];
}

export async function lockMove(
  trx: TenantDb,
  { workspaceId, postId }: PostRef,
  move: Move,
): Promise<Moving> {
  const id = pathId('destination', move.destinationId);
  const rows = await lockDestinations(trx, workspaceId, postId);
  const row = rows.find((candidate) => candidate.id === id);
  if (row === undefined) throw new HttpError('not_found', 'Destination not found.');
  if (row.version !== move.expectedVersion) {
    throw new HttpError('version_conflict', 'The destination was changed by someone else.');
  }
  if (!(move.from as ReadonlySet<string>).has(row.state)) {
    throw new HttpError('conflict', `A ${row.state} destination cannot move to ${move.to}.`);
  }
  return { row, rows };
}

export interface Resolution {
  readonly action: string;
  readonly row: LockedDestination;
  readonly postVersion: number | null;
}

export async function auditResolution(
  trx: TenantDb,
  ctx: RequestContext,
  post: PostRef,
  { action, row, postVersion }: Resolution,
): Promise<void> {
  await writeDestinationAudit(trx, {
    ctx,
    actor: await auditActor(trx, post.workspaceId, ctx.principal),
    post,
    row,
    action,
    postVersion,
    errorCode: null,
    correlationId: randomUUID(),
    args: fromOf(row),
  });
}

export function fromOf(row: LockedDestination): Readonly<Record<string, unknown>> {
  return { fromState: row.state, fromReason: row.state_reason };
}
