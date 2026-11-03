import { defineRoute } from '@kronaut/contract';
import { checkVersion, lockCurrent, lockDestinations } from '../../../access/post-access/locks.ts';
import { postUnits } from '../../../access/post-access/units.ts';
import { PostParams, pathId } from '../../../base/http/params.ts';
import { type BoundRoute, bindRoute } from '../../../base/http/request.ts';
import type { PostRouteDeps } from '../deps.ts';
import { PostSchema, readPost } from '../read/dto.ts';
import { authorizeSchedule, ScheduleInput, type ScheduleRun, scheduleLocked } from './schedule.ts';
import { startSeries } from './series-start.ts';

export const postScheduleRoute = defineRoute({
  id: 'posts.schedule',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/posts/:postId/schedule',
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: PostParams,
  body: ScheduleInput,
  response: PostSchema,
  idempotency: true,
  summary: 'Schedule a post',
  description:
    "Freezes every draft destination and schedules it, at a local time in a time zone, as soon as possible, or at the next free slot of each destination's channel queue (422 queue_empty or queue_full names the channel). With repeat (instant only) the post becomes occurrence 1 of a series that starts at that local time (422 invalid_repeat; 409 when the post is already in a series).",
  tags: ['posts'],
});

export function scheduleRoutes(deps: PostRouteDeps): BoundRoute[] {
  return [
    bindRoute(postScheduleRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const postId = pathId('post', params.postId);
      const post = await ctx.tenant(async (trx) => {
        const locked = await lockCurrent(trx, workspaceId, postId);
        const units = await postUnits(trx, workspaceId, locked);
        const auth = await authorizeSchedule(trx, ctx, { workspaceId, locked, units });
        checkVersion(locked, body.expectedVersion);
        const rows = await lockDestinations(trx, workspaceId, postId);
        const run: ScheduleRun = {
          providers: deps.providers,
          now: ctx.now,
          workspaceId,
          locked,
          auth,
          body,
        };
        await scheduleLocked(trx, run, rows);
        if (body.mode === 'instant' && body.repeat !== undefined) {
          const resource = { workspaceId, postId, units };
          await startSeries(trx, ctx, { resource, body, repeat: body.repeat });
        }
        return await readPost(trx, workspaceId, postId);
      });
      return { body: post };
    }),
  ];
}
