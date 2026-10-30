import { defineRoute } from '@kronaut/contract';
import { writePostAudit } from '../audit/write.ts';
import { PostParams, pathId } from '../http/params.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { clonePost } from './clone.ts';
import type { PostRouteDeps } from './deps.ts';
import { PostSchema, readPost } from './dto.ts';
import { lockCurrent } from './locks.ts';
import { ownerColumns } from './owner.ts';
import { postUnits } from './units.ts';

export const postDuplicateRoute = defineRoute({
  id: 'posts.duplicate',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/posts/:postId/duplicate',
  auth: ['session', 'grant'],
  action: 'posts:draft',
  params: PostParams,
  response: PostSchema,
  status: 201,
  idempotency: true,
  summary: 'Duplicate a post',
  description:
    'A new unscheduled draft with the same content, variants, media and destinations, and no approvals or publish state.',
  tags: ['posts'],
});

export function duplicateRoutes(deps: PostRouteDeps): BoundRoute[] {
  return [
    bindRoute(postDuplicateRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const sourceId = pathId('post', params.postId);
      const post = await ctx.tenant(async (trx) => {
        const locked = await lockCurrent(trx, workspaceId, sourceId);
        const units = await postUnits(trx, workspaceId, locked);
        ctx.authorize('posts:draft', { workspaceId, postId: sourceId, units });
        const copyId = await clonePost(
          trx,
          { providers: deps.providers, acting: ctx },
          {
            workspaceId,
            sourceId,
            origin: 'duplicate',
            owner: { owner_user_id: null, owner_grant_id: null, ...ownerColumns(ctx.principal) },
            at: null,
            seriesId: null,
          },
        );
        const copy = await readPost(trx, workspaceId, copyId);
        await writePostAudit(trx, {
          ctx,
          post: { workspaceId, postId: copyId },
          action: 'post.duplicated',
          postVersion: copy.version,
          args: { source_post_id: sourceId, copy_post_id: copyId },
        });
        return copy;
      });
      return { status: 201, body: post };
    }),
  ];
}
