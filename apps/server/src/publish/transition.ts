import { randomUUID } from 'node:crypto';
import type { DestinationState, StateReason } from '@kronaut/core';
import type { DB, TenantDb } from '@kronaut/db';
import type { UpdateObject } from 'kysely';
import { notifyFor } from '../notifications/write.ts';
import {
  destinationEvent,
  isDestinationEventState,
  recordPostSettlement,
  writeWebhookEvent,
} from '../webhooks/events.ts';

export type DestinationUpdate = UpdateObject<DB, 'post_destinations'>;

const AUDITED: ReadonlySet<DestinationState> = new Set([
  'published',
  'failed',
  'blocked',
  'unconfirmed',
  'awaiting_manual',
  'canceled',
]);

export interface DestinationRef {
  readonly workspaceId: string;
  readonly id: string;
  readonly postId: string;
  readonly postVersion: number | null;
  readonly socialAccountId: string;
  readonly version: number;
}

export interface StateChange {
  readonly state: DestinationState;
  readonly reason: StateReason | null;
}

export interface TransitionTo extends StateChange {
  readonly set?: DestinationUpdate;
}

export async function transition(
  trx: TenantDb,
  ref: DestinationRef,
  { state, reason, set = {} }: TransitionTo,
): Promise<void> {
  const result = await trx
    .updateTable('post_destinations')
    .set({ ...set, state, state_reason: reason, version: ref.version + 1 })
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.id)
    .where('version', '=', ref.version)
    .executeTakeFirst();
  if (result.numUpdatedRows !== 1n) throw new Error('destination changed under its lock');
}

export async function auditTransition(
  trx: TenantDb,
  ref: DestinationRef,
  change: StateChange,
  attemptId: string | null,
): Promise<void> {
  const { state, reason } = change;
  if (!AUDITED.has(state)) return;
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: ref.workspaceId,
      actor_kind: 'system',
      surface: 'worker',
      action: `destination.${state}`,
      resource_kind: 'destination',
      resource_id: ref.id,
      post_id: ref.postId,
      post_version: ref.postVersion,
      social_account_ids: [ref.socialAccountId],
      outcome: 'ok',
      error_code: reason,
      correlation_id: attemptId ?? randomUUID(),
    })
    .execute();
  if (isDestinationEventState(state)) {
    const row = await trx
      .selectFrom('post_destinations')
      .select(['provider', 'remote_id', 'remote_url', 'version'])
      .where('workspace_id', '=', ref.workspaceId)
      .where('id', '=', ref.id)
      .executeTakeFirstOrThrow();
    const event = destinationEvent(ref.workspaceId, row.version, {
      destination_id: ref.id,
      post_id: ref.postId,
      post_version: ref.postVersion,
      social_account_id: ref.socialAccountId,
      provider: row.provider,
      state,
      reason,
      remote_id: row.remote_id,
      remote_url: row.remote_url,
      attempt_id: attemptId,
    });
    await writeWebhookEvent(trx, event);
    await notifyFor(trx, event);
  }
  await recordPostSettlement(trx, ref.workspaceId, ref.postId);
}
