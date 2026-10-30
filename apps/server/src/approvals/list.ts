import { defineRoute } from '@kronaut/contract';
import { HttpError } from '../http/errors.ts';
import { PostParams, pathId } from '../http/params.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { postUnits } from '../posts/units.ts';
import { ApprovalRequestListSchema, readRequests } from './dto.ts';

export const approvalListRoute = defineRoute({
  id: 'posts.approval_requests',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/posts/:postId/approval-requests',
  auth: ['session', 'grant'],
  action: 'posts:read',
  params: PostParams,
  response: ApprovalRequestListSchema,
  summary: "List a post's approval requests",
  description:
    'The 20 newest approval requests of the post, newest first, with what each bound per destination and its decisions.',
  tags: ['approvals'],
});

export function listRoutes(): BoundRoute[] {
  return [
    bindRoute(approvalListRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const postId = pathId('post', params.postId);
      const items = await ctx.tenant(async (trx) => {
        const post = await trx
          .selectFrom('posts')
          .select(['id', 'brand_id', 'location_id'])
          .where('workspace_id', '=', workspaceId)
          .where('id', '=', postId)
          .where('deleted_at', 'is', null)
          .executeTakeFirst();
        if (post === undefined) throw new HttpError('not_found', 'Post not found.');
        ctx.authorize('posts:read', {
          workspaceId,
          postId,
          units: await postUnits(trx, workspaceId, post),
        });
        return await readRequests(trx, workspaceId, { postId });
      });
      return { body: { items } };
    }),
  ];
}
