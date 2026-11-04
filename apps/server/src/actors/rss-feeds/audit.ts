import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@kronaut/db';
import { auditActor } from '../../access/audit/write.ts';
import type { RequestContext } from '../../base/http/request.ts';

export interface FeedRef {
  readonly workspaceId: string;
  readonly feedId: string;
}

export interface FeedAudit {
  readonly ref: FeedRef;
  readonly action: string;
  readonly args?: Readonly<Record<string, string | boolean>>;
}

const SYSTEM_ACTOR = { actor_kind: 'system', surface: 'worker' } as const;

// The URL can hold a token, so an event names the feed by id only.
export async function auditFeed(
  trx: TenantDb,
  ctx: Pick<RequestContext, 'principal' | 'requestId'> | null,
  { ref, action, args }: FeedAudit,
): Promise<void> {
  const actor = ctx === null ? SYSTEM_ACTOR : await auditActor(trx, ref.workspaceId, ctx.principal);
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: ref.workspaceId,
      ...actor,
      action,
      resource_kind: 'rss_feed',
      resource_id: ref.feedId,
      outcome: 'ok',
      args_summary: JSON.stringify(args ?? {}),
      correlation_id: randomUUID(),
      ...(ctx === null ? {} : { request_id: ctx.requestId }),
    })
    .execute();
}
