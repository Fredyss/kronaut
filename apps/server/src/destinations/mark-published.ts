import { defineRoute } from '@kronaut/contract';
import { sql } from 'kysely';
import * as z from 'zod';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { PostSchema, readPost } from '../posts/dto.ts';
import { bumpPost, destinationRef } from '../posts/locks.ts';
import { ExpectedVersion } from '../posts/params.ts';
import { transition } from '../publish/finalize.ts';
import { recordPostSettlement } from '../webhooks/events.ts';
import { auditResolution, DestinationParams, lockMove, lockTarget, movableTo } from './locked.ts';

const MARKABLE = movableTo('published');

export const markPublishedRoute = defineRoute({
  id: 'destinations.mark_published',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/posts/:postId/destinations/:destinationId/mark-published',
  // Saying a post is live is a person's attestation; an API key or agent must not settle one.
  auth: ['session'],
  action: 'posts:schedule',
  params: DestinationParams,
  body: z.object({ expectedVersion: ExpectedVersion }),
  response: PostSchema,
  idempotency: true,
  summary: 'Mark a destination published',
  description:
    'Records that an unconfirmed or awaiting-manual destination is live, as a manual resolution. Parts not confirmed live are marked skipped, and a main post already live keeps its publish time.',
  tags: ['destinations'],
});

export function markPublishedRoutes(): BoundRoute[] {
  return [
    bindRoute(markPublishedRoute, async ({ params, body }, ctx) => {
      const post = await ctx.tenant(async (trx) => {
        const target = await lockTarget(trx, params);
        const { workspaceId, postId, units } = target;
        // Marking records what already happened and sends nothing, so no approval is owed.
        ctx.authorize('posts:schedule', { workspaceId, postId, units }, { approval: 'approved' });
        const { row } = await lockMove(trx, target, {
          destinationId: params.destinationId,
          expectedVersion: body.expectedVersion,
          to: 'published',
          from: MARKABLE,
        });
        await bumpPost(trx, workspaceId, postId);
        await transition(trx, destinationRef(workspaceId, postId, row, row.frozen_post_version), {
          state: 'published',
          reason: null,
          set: { resolution: 'manual', published_at: sql<Date>`coalesce(published_at, now())` },
        });
        await trx
          .updateTable('destination_items')
          .set({ state: 'skipped' })
          .where('workspace_id', '=', workspaceId)
          .where('destination_id', '=', row.id)
          .where('state', 'in', ['pending', 'sending', 'unconfirmed'])
          .execute();
        await auditResolution(trx, ctx, target, {
          action: 'destination.marked_published',
          row,
          postVersion: row.frozen_post_version,
        });
        await recordPostSettlement(trx, workspaceId, postId);
        return await readPost(trx, workspaceId, postId);
      });
      return { body: post };
    }),
  ];
}
