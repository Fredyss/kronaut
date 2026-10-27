import { defineRoute } from '@kronaut/contract';
import type { ScopeUnit } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import { dequeuePublish } from '../jobs.ts';
import { transition } from '../publish/finalize.ts';
import { recordPostSettlement } from '../webhooks/events.ts';
import { discardPublishProgress } from './destinations.ts';
import { PostSchema, readPost } from './dto.ts';
import { UNFROZEN } from './freeze.ts';
import {
  bumpPost,
  checkVersion,
  destinationRef,
  type LockedDestination,
  lockCurrent,
  lockDestinations,
} from './locks.ts';
import { ExpectedVersion, PostParams, pathId } from './params.ts';
import { postUnits } from './units.ts';

const UNSCHEDULABLE: ReadonlySet<string> = new Set(['scheduled', 'retry_wait']);

export const postUnscheduleRoute = defineRoute({
  id: 'posts.unschedule',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/posts/:postId/unschedule',
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: PostParams,
  body: z.object({ expectedVersion: ExpectedVersion }),
  response: PostSchema,
  idempotency: true,
  summary: 'Unschedule a post',
  description: 'Every scheduled or retrying destination goes back to an editable draft.',
  tags: ['posts'],
});

export function authorizeUnschedule(
  ctx: RequestContext,
  workspaceId: string,
  postId: string,
  units: readonly ScopeUnit[],
): void {
  // posts:schedule always owes an approval; removing a schedule publishes nothing, so none is owed here.
  ctx.authorize('posts:schedule', { workspaceId, postId, units }, { approval: 'approved' });
}

export async function unscheduleLocked(
  trx: TenantDb,
  workspaceId: string,
  postId: string,
  rows: readonly LockedDestination[],
): Promise<ReadonlySet<string>> {
  const targets = rows.filter((row) => UNSCHEDULABLE.has(row.state));
  if (targets.length === 0) {
    throw new HttpError('conflict', 'The post has no scheduled destination.');
  }
  await bumpPost(trx, workspaceId, postId, {
    schedule_mode: 'unscheduled',
    schedule_local: null,
    schedule_tz: null,
  });
  for (const row of targets) {
    await transition(trx, destinationRef(workspaceId, postId, row, row.frozen_post_version), {
      state: 'draft',
      reason: 'unscheduled',
      set: UNFROZEN,
    });
    await dequeuePublish(trx, row.id);
  }
  await discardPublishProgress(
    trx,
    workspaceId,
    targets.map((row) => row.id),
  );
  await recordPostSettlement(trx, workspaceId, postId);
  return new Set(targets.map((row) => row.id));
}

export function unscheduleRoutes(): BoundRoute[] {
  return [
    bindRoute(postUnscheduleRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const postId = pathId('post', params.postId);
      const post = await ctx.tenant(async (trx) => {
        const locked = await lockCurrent(trx, workspaceId, postId);
        const units = await postUnits(trx, workspaceId, locked);
        authorizeUnschedule(ctx, workspaceId, postId, units);
        checkVersion(locked, body.expectedVersion);
        const rows = await lockDestinations(trx, workspaceId, postId);
        await unscheduleLocked(trx, workspaceId, postId, rows);
        return await readPost(trx, workspaceId, postId);
      });
      return { body: post };
    }),
  ];
}
