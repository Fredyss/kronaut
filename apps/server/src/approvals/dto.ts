import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { iso, plainLocal } from '../posts/dto.ts';

const Instant = z.iso.datetime();

export const ApprovalRequestSchema = z.object({
  id: z.string(),
  state: z.enum(['open', 'approved', 'rejected', 'voided', 'withdrawn', 'revoked']),
  voidReason: z
    .enum([
      'content_changed',
      'destinations_changed',
      'schedule_changed',
      'policy_changed',
      'post_deleted',
    ])
    .nullable(),
  note: z.string().nullable(),
  requestedBy: z.object({ kind: z.enum(['user', 'grant']), id: z.string() }),
  requiredApprovals: z.number().int().positive(),
  postVersion: z.number().int().positive(),
  createdAt: Instant,
  resolvedAt: Instant.nullable(),
  destinations: z.array(
    z.object({
      destinationId: z.string(),
      scheduleBound: z.boolean(),
      shownLocal: z.iso.datetime({ local: true }).nullable(),
      shownTz: z.string().nullable(),
      toleranceMin: z.number().int().nonnegative().nullable(),
    }),
  ),
  decisions: z.array(
    z.object({
      decision: z.enum(['approve', 'reject', 'request_changes']),
      userId: z.string().nullable(),
      createdAt: Instant,
    }),
  ),
});

export type ApprovalRequestDto = z.output<typeof ApprovalRequestSchema>;

export const ApprovalRequestListSchema = z.object({ items: z.array(ApprovalRequestSchema) });

export type RequestFilter = { readonly postId: string } | { readonly requestId: string };

const LIST_LIMIT = 20;

async function loadRequests(trx: TenantDb, workspaceId: string, filter: RequestFilter) {
  const query = trx
    .selectFrom('approval_requests')
    .select([
      'id',
      'state',
      'void_reason',
      'note',
      'requested_by_user_id',
      'requested_by_grant_id',
      'required_approvals',
      'post_version',
      'created_at',
      'resolved_at',
    ])
    .where('workspace_id', '=', workspaceId);
  return await ('postId' in filter
    ? query.where('post_id', '=', filter.postId)
    : query.where('id', '=', filter.requestId)
  )
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(LIST_LIMIT)
    .execute();
}

async function loadParts(trx: TenantDb, workspaceId: string, requestIds: readonly string[]) {
  if (requestIds.length === 0) return { destinations: [], decisions: [] };
  const destinations = await trx
    .selectFrom('approval_request_destinations as ard')
    .innerJoin('post_destinations as d', (join) =>
      join
        .onRef('d.workspace_id', '=', 'ard.workspace_id')
        .onRef('d.id', '=', 'ard.destination_id'),
    )
    .select(['ard.request_id', 'ard.destination_id', 'ard.schedule_bound'])
    .select(['ard.shown_local', 'ard.shown_tz', 'ard.tolerance_min'])
    .where('ard.workspace_id', '=', workspaceId)
    .where('ard.request_id', 'in', requestIds)
    .orderBy('d.created_at')
    .orderBy('d.id')
    .execute();
  const decisions = await trx
    .selectFrom('approval_decisions')
    .select(['request_id', 'decision', 'user_id', 'created_at'])
    .where('workspace_id', '=', workspaceId)
    .where('request_id', 'in', requestIds)
    .orderBy('created_at')
    .orderBy('id')
    .execute();
  return { destinations, decisions };
}

type RequestRow = Awaited<ReturnType<typeof loadRequests>>[number];

function requesterOf(row: RequestRow): ApprovalRequestDto['requestedBy'] {
  if (row.requested_by_user_id !== null) {
    return { kind: 'user', id: encodePublicId('user', row.requested_by_user_id) };
  }
  if (row.requested_by_grant_id !== null) {
    return { kind: 'grant', id: encodePublicId('grant', row.requested_by_grant_id) };
  }
  throw new Error(`approval request ${row.id} has no requester`);
}

export async function readRequests(
  trx: TenantDb,
  workspaceId: string,
  filter: RequestFilter,
): Promise<ApprovalRequestDto[]> {
  const rows = await loadRequests(trx, workspaceId, filter);
  const parts = await loadParts(
    trx,
    workspaceId,
    rows.map((row) => row.id),
  );
  return rows.map((row) =>
    ApprovalRequestSchema.parse({
      id: encodePublicId('approvalRequest', row.id),
      state: row.state,
      voidReason: row.void_reason,
      note: row.note,
      requestedBy: requesterOf(row),
      requiredApprovals: row.required_approvals,
      postVersion: row.post_version,
      createdAt: iso(row.created_at),
      resolvedAt: iso(row.resolved_at),
      destinations: parts.destinations
        .filter((d) => d.request_id === row.id)
        .map((d) => ({
          destinationId: encodePublicId('destination', d.destination_id),
          scheduleBound: d.schedule_bound,
          shownLocal: plainLocal(d.shown_local),
          shownTz: d.shown_tz,
          toleranceMin: d.tolerance_min,
        })),
      decisions: parts.decisions
        .filter((d) => d.request_id === row.id)
        .map((d) => ({
          decision: d.decision,
          userId: d.user_id === null ? null : encodePublicId('user', d.user_id),
          createdAt: iso(d.created_at),
        })),
    }),
  );
}

export async function readRequest(
  trx: TenantDb,
  workspaceId: string,
  requestId: string,
): Promise<ApprovalRequestDto> {
  const [request] = await readRequests(trx, workspaceId, { requestId });
  if (request === undefined) throw new Error(`approval request ${requestId} vanished`);
  return request;
}
