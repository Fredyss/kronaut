import { randomUUID } from 'node:crypto';
import { encodePublicId, type Resource } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { auditActor } from '../audit/write.ts';
import { HttpError } from '../http/errors.ts';
import type { RequestContext } from '../http/types.ts';
import { ownerColumns } from '../posts/owner.ts';
import { postUnits } from '../posts/units.ts';

export const RECENT = 10;

export interface EvergreenTarget {
  readonly workspaceId: string;
  readonly postId: string;
}

export async function readResource(
  trx: TenantDb,
  { workspaceId, postId }: EvergreenTarget,
): Promise<Resource> {
  const post = await trx
    .selectFrom('posts')
    .select(['id', 'brand_id', 'location_id'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', postId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
  if (post === undefined) throw new HttpError('not_found', 'Post not found.');
  return { workspaceId, postId, units: await postUnits(trx, workspaceId, post) };
}

export async function recentCopies(trx: TenantDb, { workspaceId, postId }: EvergreenTarget) {
  const rows = await trx
    .selectFrom('evergreen_runs as r')
    .leftJoin('posts as c', (join) =>
      join
        .onRef('c.workspace_id', '=', 'r.workspace_id')
        .onRef('c.id', '=', 'r.copy_post_id')
        .on('c.deleted_at', 'is', null),
    )
    .select(['r.social_account_id', 'r.slot_at', 'c.id as copy_id'])
    .where('r.workspace_id', '=', workspaceId)
    .where('r.evergreen_post_id', '=', postId)
    .orderBy('r.slot_at', 'desc')
    .orderBy('r.id', 'desc')
    .limit(RECENT)
    .execute();
  return rows.map((row) => ({
    channelId: encodePublicId('socialAccount', row.social_account_id),
    slotAt: row.slot_at.toISOString(),
    copyPostId: row.copy_id === null ? null : encodePublicId('post', row.copy_id),
  }));
}

export async function readEvergreen(trx: TenantDb, target: EvergreenTarget) {
  const row = await trx
    .selectFrom('evergreen_posts')
    .select(['state', 'state_reason'])
    .where('workspace_id', '=', target.workspaceId)
    .where('post_id', '=', target.postId)
    .executeTakeFirst();
  if (row === undefined) throw new HttpError('not_found', 'The post is not evergreen.');
  return row;
}

async function audit(trx: TenantDb, ctx: RequestContext, target: EvergreenTarget, action: string) {
  const { workspaceId, postId } = target;
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: workspaceId,
      ...(await auditActor(trx, workspaceId, ctx.principal)),
      action,
      resource_kind: 'evergreen_post',
      resource_id: postId,
      post_id: postId,
      outcome: 'ok',
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
}

export async function markEvergreen(trx: TenantDb, ctx: RequestContext, target: EvergreenTarget) {
  const { workspaceId, postId } = target;
  const owner = { owner_user_id: null, owner_grant_id: null, ...ownerColumns(ctx.principal) };
  const changed = await trx
    .insertInto('evergreen_posts')
    .values({ workspace_id: workspaceId, post_id: postId, ...owner })
    .onConflict((oc) =>
      oc
        .columns(['workspace_id', 'post_id'])
        .doUpdateSet({ state: 'active', state_reason: null, ...owner, updated_at: sql`now()` })
        .where('evergreen_posts.state', '=', 'removed'),
    )
    .returning('post_id')
    .executeTakeFirst();
  if (changed !== undefined) await audit(trx, ctx, target, 'evergreen.marked');
}

export async function unmarkEvergreen(trx: TenantDb, ctx: RequestContext, target: EvergreenTarget) {
  const { workspaceId, postId } = target;
  const changed = await trx
    .updateTable('evergreen_posts')
    .set({ state: 'removed', state_reason: 'unmarked', updated_at: sql`now()` })
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .where('state', '=', 'active')
    .returning('post_id')
    .executeTakeFirst();
  if (changed !== undefined) await audit(trx, ctx, target, 'evergreen.unmarked');
}
