import { defineRoute } from '@kronaut/contract';
import { canTransition, DESTINATION_STATES } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { cancelLocked } from './cancel-locked.ts';
import { PostSchema, readPost } from './dto.ts';
import {
  bumpPost,
  checkVersion,
  type LockedDestination,
  lockCurrent,
  lockDestinations,
} from './locks.ts';
import { ExpectedVersion, PostParams, pathId } from './params.ts';
import { postUnits } from './units.ts';

// unconfirmed may already be live, and a canceled row can go back to draft without a duplicate check.
export const CANCELABLE: ReadonlySet<string> = new Set(
  DESTINATION_STATES.filter(
    (state) =>
      state !== 'publishing' && state !== 'unconfirmed' && canTransition(state, 'canceled'),
  ),
);

export const postCancelRoute = defineRoute({
  id: 'posts.cancel',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/posts/:postId/cancel',
  auth: ['session', 'grant'],
  action: 'posts:cancel',
  params: PostParams,
  body: z.object({ expectedVersion: ExpectedVersion }),
  response: PostSchema,
  idempotency: true,
  summary: 'Cancel a post',
  description:
    'Cancels every destination that has not published; one that is publishing stops after its current step.',
  tags: ['posts'],
});

async function requestStop(
  trx: TenantDb,
  workspaceId: string,
  stopping: readonly LockedDestination[],
): Promise<void> {
  if (stopping.length > 0) {
    await trx
      .updateTable('post_destinations')
      .set({ cancel_requested_at: sql<Date>`now()` })
      .where('workspace_id', '=', workspaceId)
      .where(
        'id',
        'in',
        stopping.map((row) => row.id),
      )
      .execute();
  }
}

export function cancelRoutes(): BoundRoute[] {
  return [
    bindRoute(postCancelRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const postId = pathId('post', params.postId);
      const post = await ctx.tenant(async (trx) => {
        const locked = await lockCurrent(trx, workspaceId, postId);
        const units = await postUnits(trx, workspaceId, locked);
        ctx.authorize('posts:cancel', { workspaceId, postId, units });
        checkVersion(locked, body.expectedVersion);
        const rows = await lockDestinations(trx, workspaceId, postId);
        const canceled = rows.filter((row) => CANCELABLE.has(row.state));
        const stopping = rows.filter(
          (row) => row.state === 'publishing' && row.cancel_requested_at === null,
        );
        if (canceled.length === 0 && stopping.length === 0) {
          throw new HttpError('conflict', 'The post has nothing left to cancel.');
        }
        await bumpPost(trx, workspaceId, postId);
        await requestStop(trx, workspaceId, stopping);
        if (canceled.length === 0) return await readPost(trx, workspaceId, postId);

        await cancelLocked(
          trx,
          ctx,
          { workspaceId, postId },
          canceled.map((row) => ({ row, reason: 'user_canceled' })),
        );
        return await readPost(trx, workspaceId, postId);
      });
      return { body: post };
    }),
  ];
}
