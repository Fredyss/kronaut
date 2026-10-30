import { defineRoute } from '@kronaut/contract';
import type { Schedule } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { unprocessable } from '../http/issues.ts';
import { InstantFields, PostParams, pathId } from '../http/params.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import type { PostRouteDeps } from '../posts/deps.ts';
import { PostSchema, readPost } from '../posts/dto.ts';
import type { Frozen } from '../posts/freeze.ts';
import {
  bumpPost,
  type CurrentPost,
  checkVersion,
  lockCurrent,
  lockDestinations,
} from '../posts/locks.ts';
import { ScheduleCommon } from '../posts/schedule.ts';
import {
  draftTargets,
  freezeTargets,
  postSchedule,
  refuseOpenRequest,
  scheduleOf,
} from '../posts/targets.ts';
import { postUnits } from '../posts/units.ts';
import type { ProviderRegistry } from '../providers.ts';
import { RepeatInput } from '../series/repeat.ts';
import { startSeries } from '../series/start.ts';
import { postApprovalRequestedEvent } from '../webhooks/events.ts';
import { announce } from './locked.ts';
import { type EffectivePolicy, effectivePolicy, policySnapshot } from './policy.ts';

const NOTE_MAX = 2000;

export const requestApprovalRoute = defineRoute({
  id: 'posts.request_approval',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/posts/:postId/approval-requests',
  auth: ['session', 'grant'],
  action: 'posts:submit',
  params: PostParams,
  body: z.strictObject({
    ...ScheduleCommon,
    note: z.string().max(NOTE_MAX).optional(),
    schedule: z.strictObject(InstantFields).optional(),
    repeat: RepeatInput.optional(),
  }),
  response: PostSchema,
  idempotency: true,
  summary: 'Request approval for a post',
  description:
    'Freezes every draft destination for review and opens an approval request; the destinations stay drafts. With a schedule, the approval binds that local time within the policy tolerance. With repeat (only together with a schedule; 422 invalid_repeat otherwise) the post becomes occurrence 1 of a series, and the series schedules it as the requester once the request is approved.',
  tags: ['approvals'],
});

interface Opening {
  readonly workspaceId: string;
  readonly postId: string;
  readonly version: number;
  readonly frozen: readonly Frozen[];
  readonly schedule: Schedule | null;
  readonly policy: EffectivePolicy;
  readonly note: string | null;
}

export interface RequestOpening {
  readonly providers: ProviderRegistry;
  readonly workspaceId: string;
  readonly locked: CurrentPost;
  readonly schedule: { readonly scheduleLocal: string; readonly scheduleTz: string } | undefined;
  readonly note: string | undefined;
  readonly acknowledgedCodes?: readonly string[] | undefined;
}

type Requester = Pick<RequestContext, 'principal' | 'now'>;

function requester(ctx: Requester) {
  const principal = ctx.principal;
  if (principal?.kind === 'user') return { requested_by_user_id: principal.userId };
  if (principal?.kind === 'grant') return { requested_by_grant_id: principal.grantId };
  throw new HttpError('internal', 'No user or API key is bound to this request.');
}

async function insertRequest(trx: TenantDb, ctx: Requester, o: Opening): Promise<string> {
  const { workspaceId, postId, policy, schedule } = o;
  const revision = await trx
    .selectFrom('post_revisions')
    .select(['content_hash', 'content_hash_v'])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .where('post_version', '=', o.version)
    .executeTakeFirstOrThrow();
  const { id } = await trx
    .insertInto('approval_requests')
    .values({
      workspace_id: workspaceId,
      post_id: postId,
      post_version: o.version,
      content_hash: revision.content_hash,
      content_hash_v: revision.content_hash_v,
      policy_id: policy.id,
      policy_version: policy.version,
      policy_snapshot: policySnapshot(policy),
      required_approvals: policy.requiredApprovals,
      ...requester(ctx),
      note: o.note,
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  await trx
    .insertInto('approval_request_destinations')
    .values(
      o.frozen.map((f) => ({
        workspace_id: workspaceId,
        request_id: id,
        destination_id: f.id,
        content_hash: f.contentHash,
        schedule_bound: schedule !== null,
        shown_local: schedule?.local.toString() ?? null,
        shown_tz: schedule?.tz ?? null,
        tolerance_min: schedule === null ? null : policy.rescheduleToleranceMin,
      })),
    )
    .execute();
  return id;
}

// The caller has locked the post and authorized posts:submit for it.
export async function openApprovalRequest(
  trx: TenantDb,
  ctx: Requester,
  opening: RequestOpening,
): Promise<string> {
  const { workspaceId, locked } = opening;
  const postId = locked.id;
  const rows = await lockDestinations(trx, workspaceId, postId);
  const targets = draftTargets(rows, {});
  await refuseOpenRequest(trx, workspaceId, postId, 'The post is already waiting for approval.');
  const spec =
    opening.schedule === undefined ? null : { mode: 'instant' as const, ...opening.schedule };
  const schedule = spec === null ? null : await scheduleOf(trx, workspaceId, spec, ctx.now);
  const set = schedule === null ? {} : postSchedule('instant', schedule);
  const version = await bumpPost(trx, workspaceId, postId, set);
  const scope = {
    providers: opening.providers,
    workspaceId,
    locked,
    body: { acknowledgedCodes: opening.acknowledgedCodes },
    reason: 'submit' as const,
  };
  const frozen = await freezeTargets(trx, scope, version, targets);
  const policy = await effectivePolicy(trx, workspaceId, locked.brand_id);
  const note = opening.note?.normalize('NFC') ?? null;
  const request = { workspaceId, postId, version, frozen, schedule, policy, note };
  const requestId = await insertRequest(trx, ctx, request);
  await announce(trx, postApprovalRequestedEvent(workspaceId, { postId, requestId }));
  return requestId;
}

export function requestRoutes(deps: PostRouteDeps): BoundRoute[] {
  return [
    bindRoute(requestApprovalRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const postId = pathId('post', params.postId);
      const post = await ctx.tenant(async (trx) => {
        const locked = await lockCurrent(trx, workspaceId, postId);
        const units = await postUnits(trx, workspaceId, locked);
        ctx.authorize('posts:submit', { workspaceId, postId, units });
        checkVersion(locked, body.expectedVersion);
        if (body.repeat !== undefined && body.schedule === undefined) {
          throw unprocessable([{ path: 'body.repeat', code: 'invalid_repeat' }]);
        }
        await openApprovalRequest(trx, ctx, {
          providers: deps.providers,
          workspaceId,
          locked,
          schedule: body.schedule,
          note: body.note,
          acknowledgedCodes: body.acknowledgedCodes,
        });
        if (body.repeat !== undefined && body.schedule !== undefined) {
          await startSeries(trx, ctx, {
            resource: { workspaceId, postId, units },
            body: body.schedule,
            repeat: body.repeat,
          });
        }
        return await readPost(trx, workspaceId, postId);
      });
      return { body: post };
    }),
  ];
}
