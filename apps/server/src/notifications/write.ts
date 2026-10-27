import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { effectivePolicy } from '../approvals/policy.ts';
import type { DestinationEventData, WebhookEventInput } from '../webhooks/events.ts';

const NEEDS_PERSON: ReadonlySet<string> = new Set(['failed', 'unconfirmed', 'awaiting_manual']);
const APPROVAL_KINDS: ReadonlySet<string> = new Set([
  'post.approval_requested',
  'post.approved',
  'post.rejected',
]);

type Audience =
  | { readonly kind: 'watchers' }
  | { readonly kind: 'approvers'; readonly except: string | null }
  | { readonly kind: 'user'; readonly userId: string };

export interface NotificationPayload {
  readonly provider: string;
  readonly socialAccountId: string;
  readonly state?: string;
  readonly reason: string | null;
}

interface Notification {
  readonly workspaceId: string;
  readonly kind: string;
  readonly dedupeKey: string;
  readonly payload: NotificationPayload;
  readonly postId: string | null;
  readonly destinationId: string | null;
  readonly incidentId: string | null;
  readonly audience: Audience;
}

type DestinationEvent = Extract<WebhookEventInput, { readonly data: DestinationEventData }>;

function isDestinationEvent(event: WebhookEventInput): event is DestinationEvent {
  return event.type.startsWith('destination.');
}

function channelPayload(event: WebhookEventInput): NotificationPayload | null {
  switch (event.type) {
    case 'channel.needs_reauth':
      return {
        provider: event.data.provider,
        socialAccountId: event.data.social_account_id,
        reason: event.data.reason,
      };
    case 'channel.expiring':
      return {
        provider: event.data.provider,
        socialAccountId: event.data.social_account_id,
        reason: 'auth_expiring',
      };
    default:
      return null;
  }
}

async function insertForMembers(trx: TenantDb, n: Notification): Promise<void> {
  const { workspaceId, postId, audience } = n;
  await trx
    .insertInto('notifications')
    .columns([
      'workspace_id',
      'user_id',
      'kind',
      'incident_id',
      'post_id',
      'destination_id',
      'payload',
      'dedupe_key',
    ])
    .expression((eb) =>
      eb
        .selectFrom('memberships as m')
        .select([
          'm.workspace_id',
          'm.user_id',
          sql<string>`${n.kind}::text`.as('kind'),
          sql<string | null>`${n.incidentId}::uuid`.as('incident_id'),
          sql<string | null>`${postId}::uuid`.as('post_id'),
          sql<string | null>`${n.destinationId}::uuid`.as('destination_id'),
          sql<string>`${JSON.stringify(n.payload)}::jsonb`.as('payload'),
          sql<string>`${n.dedupeKey}::text`.as('dedupe_key'),
        ])
        .where('m.workspace_id', '=', workspaceId)
        .where((w) => {
          if (audience.kind === 'user') return w('m.user_id', '=', audience.userId);
          if (audience.kind === 'approvers') {
            return w.and([
              w('m.can_approve', '=', true),
              w('m.user_id', 'is distinct from', audience.except),
            ]);
          }
          return w.or([
            w.and([w('m.role', 'in', ['owner', 'admin']), w('m.resource_scope', '=', 'workspace')]),
            ...(postId === null
              ? []
              : [
                  w(
                    'm.user_id',
                    '=',
                    w
                      .selectFrom('posts as p')
                      .select('p.created_by_user_id')
                      .where('p.workspace_id', '=', workspaceId)
                      .where('p.id', '=', postId),
                  ),
                ]),
          ]);
        }),
    )
    .onConflict((oc) => oc.columns(['workspace_id', 'user_id', 'dedupe_key']).doNothing())
    .execute();
}

async function approvalTarget(trx: TenantDb, workspaceId: string, requestId: string) {
  return await trx
    .selectFrom('approval_requests as r')
    .innerJoin('posts as p', (join) =>
      join.onRef('p.workspace_id', '=', 'r.workspace_id').onRef('p.id', '=', 'r.post_id'),
    )
    .innerJoin('approval_request_destinations as ard', (join) =>
      join.onRef('ard.workspace_id', '=', 'r.workspace_id').onRef('ard.request_id', '=', 'r.id'),
    )
    .innerJoin('post_destinations as d', (join) =>
      join
        .onRef('d.workspace_id', '=', 'ard.workspace_id')
        .onRef('d.id', '=', 'ard.destination_id'),
    )
    .select([
      'r.post_id',
      'r.requested_by_user_id',
      'p.brand_id',
      'd.provider',
      'd.social_account_id',
    ])
    .where('r.workspace_id', '=', workspaceId)
    .where('r.id', '=', requestId)
    .orderBy('d.created_at')
    .orderBy('d.id')
    .limit(1)
    .executeTakeFirstOrThrow();
}

// The payload names the request's first channel, so the scope filter on list and email applies to it.
async function notifyApproval(trx: TenantDb, event: WebhookEventInput): Promise<void> {
  const { workspaceId, subjectId } = event;
  if (subjectId === undefined) throw new Error(`${event.type} has no approval request`);
  const target = await approvalTarget(trx, workspaceId, subjectId);
  const requester = target.requested_by_user_id;
  let audience: Audience;
  if (event.type === 'post.approval_requested') {
    const policy = await effectivePolicy(trx, workspaceId, target.brand_id);
    audience = { kind: 'approvers', except: policy.allowSelfApproval ? null : requester };
  } else if (requester === null) {
    return;
  } else {
    audience = { kind: 'user', userId: requester };
  }
  await insertForMembers(trx, {
    workspaceId,
    kind: event.type,
    dedupeKey: event.dedupeKey,
    payload: { provider: target.provider, socialAccountId: target.social_account_id, reason: null },
    postId: target.post_id,
    destinationId: null,
    incidentId: null,
    audience,
  });
}

export async function notifyFor(
  trx: TenantDb,
  event: WebhookEventInput,
  incidentId: string | null = null,
): Promise<void> {
  const { workspaceId, dedupeKey } = event;
  if (APPROVAL_KINDS.has(event.type)) {
    await notifyApproval(trx, event);
    return;
  }
  const channel = channelPayload(event);
  if (channel !== null) {
    await insertForMembers(trx, {
      workspaceId,
      kind: event.type,
      dedupeKey,
      payload: channel,
      postId: null,
      destinationId: null,
      incidentId,
      audience: { kind: 'watchers' },
    });
    return;
  }
  if (!isDestinationEvent(event) || !NEEDS_PERSON.has(event.data.state)) return;
  const { data } = event;
  await insertForMembers(trx, {
    workspaceId,
    kind: event.type,
    dedupeKey,
    payload: {
      provider: data.provider,
      socialAccountId: data.social_account_id,
      state: data.state,
      reason: data.reason,
    },
    postId: data.post_id,
    destinationId: data.destination_id,
    incidentId: null,
    audience: { kind: 'watchers' },
  });
}
