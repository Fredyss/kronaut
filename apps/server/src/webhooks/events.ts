import { WEBHOOK_API_VERSION, type WebhookEventType } from '@kronaut/contract';
import type { DestinationState, StateReason } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';

export const DESTINATION_EVENT_STATES = [
  'published',
  'failed',
  'unconfirmed',
  'blocked',
  'awaiting_manual',
] as const satisfies readonly DestinationState[];
export type DestinationEventState = (typeof DESTINATION_EVENT_STATES)[number];

const REMOTE_ID_MAX = 512;
const REMOTE_URL_MAX = 2048;
const CODE_MAX = 128;

// provider strings have no length bound upstream; one oversized value must not push the payload past its CHECK and roll back finalize
function bounded(value: string | null, max: number): string | null {
  return value !== null && value.length > max ? null : value;
}

const COMPLETED_SUMMARIES = ['completed_all', 'completed_failed', 'completed_partial'] as const;
export type CompletedSummary = (typeof COMPLETED_SUMMARIES)[number];

export interface DestinationEventData {
  readonly destination_id: string;
  readonly post_id: string;
  readonly post_version: number | null;
  readonly social_account_id: string;
  readonly provider: string;
  readonly state: DestinationEventState;
  readonly reason: StateReason | null;
  readonly remote_id: string | null;
  readonly remote_url: string | null;
  readonly attempt_id: string | null;
  readonly failed_item_position?: number;
}

export interface PostCompletedData {
  readonly post_id: string;
  readonly summary: CompletedSummary;
  readonly published: number;
  readonly failed: number;
  readonly canceled: number;
}

export interface ChannelNeedsReauthData {
  readonly social_account_id: string;
  readonly provider: string;
  readonly reason: string;
}

export interface ChannelExpiringData {
  readonly social_account_id: string;
  readonly provider: string;
  readonly expires_at: string;
}

export interface ChannelReconnectedData {
  readonly social_account_id: string;
  readonly provider: string;
}

export interface ProviderAppMisconfiguredData {
  readonly provider_app_id: string;
  readonly provider: string;
  readonly code: string | null;
}

export interface PostApprovalData {
  readonly post_id: string;
  readonly approval_request_id: string;
}

export type ApprovalEventType = 'post.approval_requested' | 'post.approved' | 'post.rejected';

export interface ApprovalRef {
  readonly postId: string;
  readonly requestId: string;
}

export type WebhookEventBody =
  | { readonly type: `destination.${DestinationEventState}`; readonly data: DestinationEventData }
  | { readonly type: 'post.completed'; readonly data: PostCompletedData }
  | { readonly type: ApprovalEventType; readonly data: PostApprovalData }
  | { readonly type: 'channel.needs_reauth'; readonly data: ChannelNeedsReauthData }
  | { readonly type: 'channel.expiring'; readonly data: ChannelExpiringData }
  | { readonly type: 'channel.reconnected'; readonly data: ChannelReconnectedData }
  | { readonly type: 'provider_app.misconfigured'; readonly data: ProviderAppMisconfiguredData };

export type WebhookEventInput = WebhookEventBody & {
  readonly workspaceId: string;
  readonly dedupeKey: string;
  readonly subjectId?: string;
  readonly sequence?: number;
};

export function isDestinationEventState(state: DestinationState): state is DestinationEventState {
  return (DESTINATION_EVENT_STATES as readonly string[]).includes(state);
}

function isCompleted(summary: string): summary is CompletedSummary {
  return (COMPLETED_SUMMARIES as readonly string[]).includes(summary);
}

export function destinationEvent(
  workspaceId: string,
  version: number,
  data: DestinationEventData,
): WebhookEventInput {
  return {
    workspaceId,
    type: `destination.${data.state}`,
    dedupeKey: `destination.${data.destination_id}.${version}`,
    subjectId: data.destination_id,
    sequence: version,
    data: {
      ...data,
      remote_id: bounded(data.remote_id, REMOTE_ID_MAX),
      remote_url: bounded(data.remote_url, REMOTE_URL_MAX),
    },
  };
}

export function postCompletedEvent(
  workspaceId: string,
  settleSeq: number,
  data: PostCompletedData,
): WebhookEventInput {
  return {
    workspaceId,
    type: 'post.completed',
    dedupeKey: `post.completed.${data.post_id}.${settleSeq}`,
    subjectId: data.post_id,
    sequence: settleSeq,
    data,
  };
}

function approvalEvent(
  type: ApprovalEventType,
  workspaceId: string,
  { postId, requestId }: ApprovalRef,
): WebhookEventInput {
  return {
    workspaceId,
    type,
    dedupeKey: `${type}.${requestId}`,
    subjectId: requestId,
    data: { post_id: postId, approval_request_id: requestId },
  };
}

export function postApprovalRequestedEvent(workspaceId: string, ref: ApprovalRef) {
  return approvalEvent('post.approval_requested', workspaceId, ref);
}

export function postApprovedEvent(workspaceId: string, ref: ApprovalRef) {
  return approvalEvent('post.approved', workspaceId, ref);
}

export function postRejectedEvent(workspaceId: string, ref: ApprovalRef) {
  return approvalEvent('post.rejected', workspaceId, ref);
}

export function channelNeedsReauthEvent(
  workspaceId: string,
  statusChangedAt: Temporal.Instant,
  data: ChannelNeedsReauthData,
): WebhookEventInput {
  return {
    workspaceId,
    type: 'channel.needs_reauth',
    dedupeKey: `channel.needs_reauth.${data.social_account_id}.${statusChangedAt.toString()}`,
    subjectId: data.social_account_id,
    data,
  };
}

export function channelExpiringEvent(
  workspaceId: string,
  incidentId: string,
  data: ChannelExpiringData,
): WebhookEventInput {
  return {
    workspaceId,
    type: 'channel.expiring',
    dedupeKey: `channel.expiring.${data.social_account_id}.${incidentId}`,
    subjectId: data.social_account_id,
    data,
  };
}

export function channelReconnectedEvent(
  workspaceId: string,
  statusChangedAt: Temporal.Instant,
  data: ChannelReconnectedData,
): WebhookEventInput {
  return {
    workspaceId,
    type: 'channel.reconnected',
    dedupeKey: `channel.reconnected.${data.social_account_id}.${statusChangedAt.toString()}`,
    subjectId: data.social_account_id,
    data,
  };
}

export function providerAppMisconfiguredEvent(
  workspaceId: string,
  incidentId: string,
  data: ProviderAppMisconfiguredData,
): WebhookEventInput {
  return {
    workspaceId,
    type: 'provider_app.misconfigured',
    dedupeKey: `provider_app.misconfigured.${data.provider_app_id}.${incidentId}`,
    subjectId: data.provider_app_id,
    data: { ...data, code: bounded(data.code, CODE_MAX) },
  };
}

export async function writeWebhookEvent(trx: TenantDb, event: WebhookEventInput): Promise<boolean> {
  const { workspaceId, dedupeKey, data } = event;
  const type: WebhookEventType = event.type;
  const inserted = await sql<{ id: string }>`
    with e as (select uuidv7() as id, now() as at)
    insert into webhook_events
      (workspace_id, id, type, dedupe_key, subject_id, sequence, payload, occurred_at)
    select ${workspaceId}::uuid, e.id, ${type}::text, ${dedupeKey}::text,
           ${event.subjectId ?? null}::uuid, ${event.sequence ?? null}::integer,
           jsonb_build_object(
             'id', e.id,
             'type', ${type}::text,
             'created_at', to_char(e.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
             'api_version', ${WEBHOOK_API_VERSION}::text,
             'workspace_id', ${workspaceId}::uuid,
             'data', ${JSON.stringify(data)}::jsonb
           ),
           e.at
      from e
    on conflict (workspace_id, dedupe_key) do nothing
    returning id
  `.execute(trx);
  const eventId = inserted.rows[0]?.id;
  if (eventId === undefined) return false;
  await trx
    .insertInto('webhook_deliveries')
    .columns(['workspace_id', 'endpoint_id', 'event_id'])
    .expression((eb) =>
      eb
        .selectFrom('webhook_endpoints')
        .select(['workspace_id', 'id', sql<string>`${eventId}::uuid`.as('event_id')])
        .where('workspace_id', '=', workspaceId)
        .where('enabled', '=', true)
        .where(sql<boolean>`${type}::text = any(events)`),
    )
    .execute();
  return true;
}

export async function recordPostSettlement(
  trx: TenantDb,
  workspaceId: string,
  postId: string,
): Promise<void> {
  const post = await trx
    .selectFrom('posts')
    .select(['publish_summary', 'settle_seq'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', postId)
    .executeTakeFirst();
  if (post === undefined || !isCompleted(post.publish_summary) || post.settle_seq <= 0) return;
  const counts = await trx
    .selectFrom('post_destinations')
    .select([
      sql<number>`count(*) filter (where state = 'published')::integer`.as('published'),
      sql<number>`count(*) filter (where state = 'failed')::integer`.as('failed'),
      sql<number>`count(*) filter (where state = 'canceled')::integer`.as('canceled'),
    ])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .executeTakeFirstOrThrow();
  await writeWebhookEvent(
    trx,
    postCompletedEvent(workspaceId, post.settle_seq, {
      post_id: postId,
      summary: post.publish_summary,
      published: counts.published,
      failed: counts.failed,
      canceled: counts.canceled,
    }),
  );
}
