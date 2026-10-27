import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { cancelLocked } from '../posts/cancel-locked.ts';
import { PostSchema, readPost } from '../posts/dto.ts';
import { bumpPost } from '../posts/locks.ts';
import { ExpectedVersion } from '../posts/params.ts';
import { DestinationParams, fromOf, lockMove, lockTarget, movableTo } from './locked.ts';

const CANCELABLE = movableTo('canceled');

export const destinationCancelRoute = defineRoute({
  id: 'destinations.cancel',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/posts/:postId/destinations/:destinationId/cancel',
  auth: ['session', 'grant'],
  action: 'posts:cancel',
  params: DestinationParams,
  body: z.object({ expectedVersion: ExpectedVersion }),
  response: PostSchema,
  idempotency: true,
  summary: 'Cancel a destination',
  description:
    'Cancels a failed, blocked or awaiting-manual destination. An unconfirmed one may already be live, so it is refused: mark it published or send it again.',
  tags: ['destinations'],
});

export function destinationCancelRoutes(): BoundRoute[] {
  return [
    bindRoute(destinationCancelRoute, async ({ params, body }, ctx) => {
      const post = await ctx.tenant(async (trx) => {
        const target = await lockTarget(trx, params);
        const { workspaceId, postId, units } = target;
        ctx.authorize('posts:cancel', { workspaceId, postId, units });
        const { row } = await lockMove(trx, target, {
          destinationId: params.destinationId,
          expectedVersion: body.expectedVersion,
          to: 'canceled',
          from: CANCELABLE,
        });
        // As in posts.cancel: it may already be live, and a canceled row can go back to draft unchecked.
        if (row.state === 'unconfirmed') {
          throw new HttpError(
            'conflict',
            'An unconfirmed destination may already be live: mark it published or send it again.',
          );
        }
        await bumpPost(trx, workspaceId, postId);
        const reason = row.state === 'awaiting_manual' ? 'skipped_manual' : 'user_canceled';
        await cancelLocked(trx, ctx, target, [{ row, reason, args: fromOf(row) }]);
        return await readPost(trx, workspaceId, postId);
      });
      return { body: post };
    }),
  ];
}
