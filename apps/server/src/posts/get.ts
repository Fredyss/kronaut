import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { PostSchema, readPost } from './dto.ts';
import { pathId } from './params.ts';
import { postUnits } from './units.ts';

export const postGetRoute = defineRoute({
  id: 'posts.get',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/posts/:postId',
  auth: ['session', 'grant'],
  action: 'posts:read',
  params: z.object({ workspaceId: z.string(), postId: z.string() }),
  response: PostSchema,
  summary: 'Get a post',
  tags: ['posts'],
});

export function getRoutes(): BoundRoute[] {
  return [
    bindRoute(postGetRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const postId = pathId('post', params.postId);
      const post = await ctx.tenant(async (trx) => {
        const row = await trx
          .selectFrom('posts')
          .select(['id', 'brand_id', 'location_id'])
          .where('workspace_id', '=', workspaceId)
          .where('id', '=', postId)
          .where('deleted_at', 'is', null)
          .executeTakeFirst();
        if (row === undefined) throw new HttpError('not_found', 'Post not found.');
        const units = await postUnits(trx, workspaceId, row);
        ctx.authorize('posts:read', { workspaceId, postId, units });
        return await readPost(trx, workspaceId, postId);
      });
      return { body: post };
    }),
  ];
}
