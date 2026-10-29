import { defineRoute } from '@kronaut/contract';
import { sql } from 'kysely';
import * as z from 'zod';
import { closeRequest } from '../approvals/locked.ts';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { writePostAudit } from './audit.ts';
import { cancelLocked } from './cancel-locked.ts';
import { bumpPost, lockCurrent, lockDestinations } from './locks.ts';
import { PostParams, pathId } from './params.ts';
import { postUnits } from './units.ts';

const LIVE: ReadonlySet<string> = new Set(['publishing', 'retry_wait', 'verifying']);

export const postDeleteRoute = defineRoute({
  id: 'posts.delete',
  method: 'DELETE',
  path: '/v1/workspaces/:workspaceId/posts/:postId',
  auth: ['session', 'grant'],
  action: 'posts:draft',
  params: PostParams,
  response: z.undefined(),
  status: 204,
  idempotency: true,
  summary: 'Delete a post',
  description:
    'Scheduled destinations are canceled (this also needs posts:cancel) and an open approval request is voided. Published content stays on the network. 409 destination_live while a destination is publishing, retrying or being verified.',
  tags: ['posts'],
});

export function deleteRoutes(): BoundRoute[] {
  return [
    bindRoute(postDeleteRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const postId = pathId('post', params.postId);
      const post = { workspaceId, postId };
      await ctx.tenant(async (trx) => {
        const locked = await lockCurrent(trx, workspaceId, postId);
        const units = await postUnits(trx, workspaceId, locked);
        ctx.authorize('posts:draft', { workspaceId, postId, units });
        const rows = await lockDestinations(trx, workspaceId, postId);
        if (rows.some((row) => LIVE.has(row.state))) {
          throw new HttpError('destination_live', 'A destination of this post is publishing.');
        }
        const scheduled = rows.filter((row) => row.state === 'scheduled');
        if (scheduled.length > 0) {
          ctx.authorize('posts:cancel', { workspaceId, postId, units });
          await cancelLocked(
            trx,
            ctx,
            post,
            scheduled.map((row) => ({ row, reason: 'user_canceled' })),
          );
        }
        await closeRequest(
          trx,
          workspaceId,
          { postId },
          { state: 'voided', reason: 'post_deleted' },
        );
        const postVersion = await bumpPost(trx, workspaceId, postId, {
          deleted_at: sql<Date>`now()`,
        });
        await writePostAudit(trx, { ctx, post, action: 'post.deleted', postVersion });
      });
      return { body: undefined };
    }),
  ];
}
