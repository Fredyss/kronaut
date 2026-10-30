import { defineRoute } from '@kronaut/contract';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { unprocessable } from '../http/issues.ts';
import { InstantFields } from '../http/params.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import type { PostRouteDeps } from '../posts/deps.ts';
import { restartPublishProgress } from '../posts/destinations.ts';
import { PostSchema, readPost } from '../posts/dto.ts';
import type { LockedDestination } from '../posts/locks.ts';
import {
  authorizeSchedule,
  ScheduleCommon,
  type ScheduleRun,
  scheduleLocked,
} from '../posts/schedule.ts';
import { auditResolution, DestinationParams, lockMove, lockTarget, movableTo } from './locked.ts';

const RESENDABLE = movableTo('scheduled');

const Resend = { ...ScheduleCommon, acknowledgeDuplicate: z.boolean().optional() };

export const sendAgainRoute = defineRoute({
  id: 'destinations.send_again',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/posts/:postId/destinations/:destinationId/send-again',
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: DestinationParams,
  body: z.discriminatedUnion('mode', [
    z.object({ ...Resend, mode: z.literal('instant'), ...InstantFields }),
    z.strictObject({ ...Resend, mode: z.literal('asap') }),
  ]),
  response: PostSchema,
  idempotency: true,
  summary: 'Send a destination again',
  description:
    'Freezes and schedules a failed, blocked or unconfirmed destination again; parts already confirmed live are not sent twice. An unconfirmed one, or one with a part whose send was never confirmed, may already be live, so it needs acknowledgeDuplicate.',
  tags: ['destinations'],
});

async function mayBeLive(
  trx: TenantDb,
  workspaceId: string,
  row: LockedDestination,
): Promise<boolean> {
  if (row.state === 'unconfirmed') return true;
  const sent = await trx
    .selectFrom('destination_items')
    .select('position')
    .where('workspace_id', '=', workspaceId)
    .where('destination_id', '=', row.id)
    .where('state', 'in', ['sending', 'unconfirmed'])
    .executeTakeFirst();
  return sent !== undefined;
}

export function sendAgainRoutes(deps: PostRouteDeps): BoundRoute[] {
  return [
    bindRoute(sendAgainRoute, async ({ params, body }, ctx) => {
      const post = await ctx.tenant(async (trx) => {
        const target = await lockTarget(trx, params);
        const { workspaceId, postId, locked } = target;
        const auth = await authorizeSchedule(trx, ctx, target);
        const { row, rows } = await lockMove(trx, target, {
          destinationId: params.destinationId,
          expectedVersion: body.expectedVersion,
          to: 'scheduled',
          from: RESENDABLE,
        });
        if (body.acknowledgeDuplicate !== true && (await mayBeLive(trx, workspaceId, row))) {
          throw unprocessable([{ path: 'body.acknowledgeDuplicate', code: 'duplicate_risk' }]);
        }
        const run: ScheduleRun = {
          providers: deps.providers,
          now: ctx.now,
          workspaceId,
          locked,
          auth,
          body,
          only: new Set([row.id]),
          from: RESENDABLE,
          resetProgress: restartPublishProgress,
        };
        const version = await scheduleLocked(trx, run, rows);
        await auditResolution(trx, ctx, target, {
          action: 'destination.resent',
          row,
          postVersion: version,
        });
        return await readPost(trx, workspaceId, postId);
      });
      return { body: post };
    }),
  ];
}
