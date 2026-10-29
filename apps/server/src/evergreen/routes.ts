import { randomUUID } from 'node:crypto';
import { defineRoute } from '@kronaut/contract';
import { encodePublicId, type Resource } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import { auditActor } from '../posts/audit.ts';
import { lockCurrent } from '../posts/locks.ts';
import { ownerColumns } from '../posts/owner.ts';
import { PostParams, pathId } from '../posts/params.ts';
import { postUnits } from '../posts/units.ts';

const PATH = '/v1/workspaces/:workspaceId/posts/:postId/evergreen';
const RECENT = 10;

export const EvergreenSchema = z.object({
  state: z.enum(['active', 'removed']),
  stateReason: z.enum(['owner_lost', 'copy_failed', 'unmarked']).nullable(),
  recent: z.array(
    z.object({
      channelId: z.string(),
      slotAt: z.iso.datetime(),
      copyPostId: z.string().nullable(),
    }),
  ),
});

export const evergreenGetRoute = defineRoute({
  id: 'evergreen.get',
  method: 'GET',
  path: PATH,
  auth: ['session', 'grant'],
  action: 'posts:read',
  params: PostParams,
  response: EvergreenSchema,
  summary: "Get a post's evergreen state",
  description: `Whether the post is in the evergreen pool, why it left it, and its ${RECENT} most recent copies (channel, queue slot, copy post; null once the copy is deleted). 404 when the post was never marked.`,
  tags: ['posts'],
});

export const evergreenMarkRoute = defineRoute({
  id: 'evergreen.mark',
  method: 'PUT',
  path: PATH,
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: PostParams,
  response: EvergreenSchema,
  idempotency: true,
  summary: 'Add a post to the evergreen pool',
  description:
    'Free queue slots up to 24 h ahead are filled with copies of pool posts, at most once per channel every 30 days. The caller becomes the owner: copies are scheduled or submitted in their name. Marking a removed post again makes the caller its new owner; marking an active one changes nothing.',
  tags: ['posts'],
});

export const evergreenUnmarkRoute = defineRoute({
  id: 'evergreen.unmark',
  method: 'DELETE',
  path: PATH,
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: PostParams,
  response: EvergreenSchema,
  idempotency: true,
  summary: 'Remove a post from the evergreen pool',
  description:
    'No further copies are made. Existing copies stay as they are. 404 when the post was never marked.',
  tags: ['posts'],
});

interface Target {
  readonly workspaceId: string;
  readonly postId: string;
}

function targetOf(params: z.output<typeof PostParams>): Target {
  return {
    workspaceId: pathId('workspace', params.workspaceId),
    postId: pathId('post', params.postId),
  };
}

async function readResource(trx: TenantDb, { workspaceId, postId }: Target): Promise<Resource> {
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

async function recentCopies(trx: TenantDb, { workspaceId, postId }: Target) {
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

async function evergreenDto(trx: TenantDb, target: Target) {
  const row = await trx
    .selectFrom('evergreen_posts')
    .select(['state', 'state_reason'])
    .where('workspace_id', '=', target.workspaceId)
    .where('post_id', '=', target.postId)
    .executeTakeFirst();
  if (row === undefined) throw new HttpError('not_found', 'The post is not evergreen.');
  return EvergreenSchema.parse({
    state: row.state,
    stateReason: row.state_reason,
    recent: await recentCopies(trx, target),
  });
}

async function audit(trx: TenantDb, ctx: RequestContext, target: Target, action: string) {
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

async function mark(trx: TenantDb, ctx: RequestContext, target: Target) {
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

async function unmark(trx: TenantDb, ctx: RequestContext, target: Target) {
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

type Change = (trx: TenantDb, ctx: RequestContext, target: Target) => Promise<void>;

async function change(ctx: RequestContext, params: z.output<typeof PostParams>, apply: Change) {
  const target = targetOf(params);
  return await ctx.tenant(async (trx) => {
    const locked = await lockCurrent(trx, target.workspaceId, target.postId);
    const units = await postUnits(trx, target.workspaceId, locked);
    const resource = { ...target, units };
    ctx.authorize('posts:schedule', resource, { approval: 'approved' });
    await apply(trx, ctx, target);
    return await evergreenDto(trx, target);
  });
}

export function evergreenRoutes(): BoundRoute[] {
  return [
    bindRoute(evergreenGetRoute, async ({ params }, ctx) => {
      const target = targetOf(params);
      const body = await ctx.tenant(async (trx) => {
        ctx.authorize('posts:read', await readResource(trx, target));
        return await evergreenDto(trx, target);
      });
      return { body };
    }),
    bindRoute(evergreenMarkRoute, async ({ params }, ctx) => {
      return { body: await change(ctx, params, mark) };
    }),
    bindRoute(evergreenUnmarkRoute, async ({ params }, ctx) => {
      return { body: await change(ctx, params, unmark) };
    }),
  ];
}
