import { defineRoute } from '@kronaut/contract';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { PostParams, pathId } from '../http/params.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import { lockCurrent } from '../posts/locks.ts';
import { postUnits } from '../posts/units.ts';
import {
  type EvergreenTarget,
  markEvergreen,
  RECENT,
  readEvergreen,
  readResource,
  recentCopies,
  unmarkEvergreen,
} from './store.ts';

const PATH = '/v1/workspaces/:workspaceId/posts/:postId/evergreen';

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

function targetOf(params: z.output<typeof PostParams>): EvergreenTarget {
  return {
    workspaceId: pathId('workspace', params.workspaceId),
    postId: pathId('post', params.postId),
  };
}

async function evergreenDto(trx: TenantDb, target: EvergreenTarget) {
  const row = await readEvergreen(trx, target);
  return EvergreenSchema.parse({
    state: row.state,
    stateReason: row.state_reason,
    recent: await recentCopies(trx, target),
  });
}

type Change = (trx: TenantDb, ctx: RequestContext, target: EvergreenTarget) => Promise<void>;

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
      return { body: await change(ctx, params, markEvergreen) };
    }),
    bindRoute(evergreenUnmarkRoute, async ({ params }, ctx) => {
      return { body: await change(ctx, params, unmarkEvergreen) };
    }),
  ];
}
