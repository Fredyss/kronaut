import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import type { PostRouteDeps } from './deps.ts';
import { PostSchema, readPost } from './dto.ts';
import {
  checkVersion,
  destinationRows,
  type LockedDestination,
  lockCurrent,
  lockDestinations,
} from './locks.ts';
import { PostParams, pathId } from './params.ts';
import {
  authorizeSchedule,
  InstantFields,
  ScheduleCommon,
  type ScheduleRun,
  scheduleLocked,
} from './schedule.ts';
import { postUnits } from './units.ts';
import { authorizeUnschedule, unscheduleLocked } from './unschedule.ts';

const IN_FLIGHT: ReadonlySet<string> = new Set(['publishing', 'verifying', 'retry_wait']);

export const postRescheduleRoute = defineRoute({
  id: 'posts.reschedule',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/posts/:postId/reschedule',
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: PostParams,
  body: z.object({ ...ScheduleCommon, ...InstantFields }),
  response: PostSchema,
  idempotency: true,
  summary: 'Reschedule a post',
  description:
    'Unschedules and schedules again at a local time in a time zone, in one step. Every scheduled destination moves; a post with a destination publishing, verifying or waiting to retry is refused.',
  tags: ['posts'],
});

function checkReschedulable(rows: readonly LockedDestination[]): void {
  if (!rows.some((row) => row.state === 'scheduled')) {
    throw new HttpError('conflict', 'The post has no scheduled destination to move.');
  }
  if (rows.some((row) => IN_FLIGHT.has(row.state))) {
    throw new HttpError(
      'conflict',
      'The post is publishing or waiting to retry, so it cannot be moved now.',
    );
  }
}

function keptBindings(rows: readonly LockedDestination[]): ReadonlyMap<string, string> {
  return new Map(
    rows.flatMap((row) =>
      row.state === 'scheduled' && row.approval_request_id !== null
        ? [[row.id, row.approval_request_id] as const]
        : [],
    ),
  );
}

export function rescheduleRoutes(deps: PostRouteDeps): BoundRoute[] {
  return [
    bindRoute(postRescheduleRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const postId = pathId('post', params.postId);
      const post = await ctx.tenant(async (trx) => {
        const locked = await lockCurrent(trx, workspaceId, postId);
        const units = await postUnits(trx, workspaceId, locked);
        authorizeUnschedule(ctx, workspaceId, postId, units);
        const auth = await authorizeSchedule(trx, ctx, { workspaceId, locked, units });
        checkVersion(locked, body.expectedVersion);
        const rows = await lockDestinations(trx, workspaceId, postId);
        checkReschedulable(rows);
        const moved = await unscheduleLocked(trx, workspaceId, postId, rows);
        const drafts = await destinationRows(trx, workspaceId, postId).execute();
        const run: ScheduleRun = {
          providers: deps.providers,
          now: ctx.now,
          workspaceId,
          locked,
          auth,
          body: { ...body, mode: 'instant' },
          only: moved,
          kept: keptBindings(rows),
        };
        await scheduleLocked(trx, run, drafts);
        return await readPost(trx, workspaceId, postId);
      });
      return { body: post };
    }),
  ];
}
