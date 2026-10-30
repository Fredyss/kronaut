import type { ScopeUnit } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { notifyFor } from '../notifications/write.ts';
import { type CurrentPost, lockCurrent } from '../posts/locks.ts';
import { postUnits } from '../posts/units.ts';
import { type WebhookEventInput, writeWebhookEvent } from '../webhooks/events.ts';

export const RequestParams = z.object({ workspaceId: z.string(), requestId: z.string() });

export type VoidReason =
  | 'content_changed'
  | 'destinations_changed'
  | 'schedule_changed'
  | 'post_deleted';

export type Closing =
  | { readonly state: 'approved' | 'rejected' | 'withdrawn' }
  | { readonly state: 'voided'; readonly reason: VoidReason };

function requestRow(trx: TenantDb, workspaceId: string, requestId: string) {
  return trx
    .selectFrom('approval_requests')
    .select(['id', 'post_id', 'state', 'required_approvals', 'policy_snapshot'])
    .select(['requested_by_user_id', 'requested_by_grant_id'])
    .select((eb) =>
      eb
        .selectFrom('access_grants as g')
        .select('g.sponsor_user_id')
        .whereRef('g.workspace_id', '=', 'approval_requests.workspace_id')
        .whereRef('g.id', '=', 'approval_requests.requested_by_grant_id')
        .as('requested_by_sponsor_user_id'),
    )
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', requestId);
}

// The post is locked before the request, the same order as a post edit that voids it.
export async function lockRequest(trx: TenantDb, workspaceId: string, requestId: string) {
  const found = await requestRow(trx, workspaceId, requestId).executeTakeFirst();
  if (found === undefined) throw new HttpError('not_found', 'Approval request not found.');
  const locked: CurrentPost = await lockCurrent(trx, workspaceId, found.post_id);
  const request = await requestRow(trx, workspaceId, requestId)
    .forUpdate()
    .executeTakeFirstOrThrow();
  const units: ScopeUnit[] = await postUnits(trx, workspaceId, locked);
  return { locked, units, request };
}

export type LockedRequest = Awaited<ReturnType<typeof lockRequest>>['request'];

export type RequestTarget = { readonly requestId: string } | { readonly postId: string };

export async function closeRequest(
  trx: TenantDb,
  workspaceId: string,
  target: RequestTarget,
  closing: Closing,
): Promise<void> {
  const update = trx
    .updateTable('approval_requests')
    .set({
      state: closing.state,
      void_reason: closing.state === 'voided' ? closing.reason : null,
      resolved_at: sql<Date>`now()`,
    })
    .where('workspace_id', '=', workspaceId)
    .where('state', '=', 'open');
  await ('requestId' in target
    ? update.where('id', '=', target.requestId)
    : update.where('post_id', '=', target.postId)
  ).execute();
}

export async function announce(trx: TenantDb, event: WebhookEventInput): Promise<void> {
  await writeWebhookEvent(trx, event);
  await notifyFor(trx, event);
}
