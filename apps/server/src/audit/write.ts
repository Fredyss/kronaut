import { randomUUID } from 'node:crypto';
import type { Principal } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { HttpError } from '../http/errors.ts';
import type { RequestContext } from '../http/types.ts';
import type { LockedDestination, PostRef } from '../posts/locks.ts';

export async function auditActor(trx: TenantDb, workspaceId: string, principal: Principal | null) {
  if (principal?.kind === 'user') {
    return { actor_kind: 'user', actor_id: principal.userId, surface: 'ui' };
  }
  if (principal?.kind === 'grant') {
    const { kind } = await trx
      .selectFrom('access_grants')
      .select('kind')
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', principal.grantId)
      .executeTakeFirstOrThrow();
    return {
      actor_kind: 'grant',
      actor_id: principal.grantId,
      grant_kind: kind,
      sponsor_user_id: principal.sponsorUserId,
      surface: 'api',
    };
  }
  throw new HttpError('internal', 'No actor is bound to this request.');
}

export type AuditActor = Awaited<ReturnType<typeof auditActor>>;

export interface DestinationAudit {
  readonly ctx: RequestContext;
  readonly actor: AuditActor;
  readonly post: PostRef;
  readonly row: LockedDestination;
  readonly action: string;
  readonly postVersion: number | null;
  readonly errorCode: string | null;
  readonly correlationId: string;
  readonly args?: Readonly<Record<string, unknown>>;
}

export async function writeDestinationAudit(trx: TenantDb, audit: DestinationAudit): Promise<void> {
  const { post, row } = audit;
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: post.workspaceId,
      ...audit.actor,
      action: audit.action,
      resource_kind: 'destination',
      resource_id: row.id,
      post_id: post.postId,
      post_version: audit.postVersion,
      social_account_ids: [row.social_account_id],
      outcome: 'ok',
      error_code: audit.errorCode,
      ...(audit.args === undefined ? {} : { args_summary: JSON.stringify(audit.args) }),
      correlation_id: audit.correlationId,
      request_id: audit.ctx.requestId,
    })
    .execute();
}

export interface PostAudit {
  readonly ctx: RequestContext;
  readonly post: PostRef;
  readonly action: string;
  readonly postVersion: number;
  readonly args?: Readonly<Record<string, unknown>>;
}

export async function writePostAudit(trx: TenantDb, audit: PostAudit): Promise<void> {
  const { ctx, post } = audit;
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: post.workspaceId,
      ...(await auditActor(trx, post.workspaceId, ctx.principal)),
      action: audit.action,
      resource_kind: 'post',
      resource_id: post.postId,
      post_id: post.postId,
      post_version: audit.postVersion,
      outcome: 'ok',
      ...(audit.args === undefined ? {} : { args_summary: JSON.stringify(audit.args) }),
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
}
