import { CONTENT_HASH_V } from '@kronaut/compose';
import { defineRoute } from '@kronaut/contract';
import {
  type ApprovalStatus,
  PUBLISH_DEADLINE_MS,
  type Schedule,
  type ScopeUnit,
  toDate,
} from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { type Binding, bindingColumns, resolveApproval } from '../approvals/binding.ts';
import { HttpError } from '../http/errors.ts';
import { ExpectedVersion, InstantFields, PostParams, pathId } from '../http/params.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import { enqueuePublish } from '../jobs.ts';
import type { ProviderRegistry } from '../providers.ts';
import { type DestinationUpdate, transition } from '../publish/finalize.ts';
import { approvalStatus } from '../publish/principal.ts';
import { RepeatInput } from '../series/repeat.ts';
import { startSeries } from '../series/start.ts';
import { recordPostSettlement } from '../webhooks/events.ts';
import type { PostRouteDeps } from './deps.ts';
import { discardPublishProgress, type ProgressReset } from './destinations.ts';
import { PostSchema, readPost } from './dto.ts';
import { FRESH_PUBLISH, type Frozen } from './freeze.ts';
import {
  bumpPost,
  type CurrentPost,
  checkVersion,
  destinationRef,
  type LockedDestination,
  lockCurrent,
  lockDestinations,
} from './locks.ts';
import {
  draftTargets,
  earliest,
  freezeTargets,
  postSchedule,
  refuseOpenRequest,
  type Target,
  targetSchedules,
} from './targets.ts';
import { postUnits } from './units.ts';

const WAITING = 'The post is waiting for approval.';

export const ScheduleCommon = {
  expectedVersion: ExpectedVersion,
  acknowledgedCodes: z
    .array(z.string().regex(/^[a-z_]{1,64}$/))
    .max(32)
    .optional(),
};

export const postScheduleRoute = defineRoute({
  id: 'posts.schedule',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/posts/:postId/schedule',
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: PostParams,
  body: z.discriminatedUnion('mode', [
    z.object({
      ...ScheduleCommon,
      mode: z.literal('instant'),
      ...InstantFields,
      repeat: RepeatInput.optional(),
    }),
    z.strictObject({ ...ScheduleCommon, mode: z.literal('asap') }),
    z.strictObject({ ...ScheduleCommon, mode: z.literal('queue') }),
  ]),
  response: PostSchema,
  idempotency: true,
  summary: 'Schedule a post',
  description:
    "Freezes every draft destination and schedules it, at a local time in a time zone, as soon as possible, or at the next free slot of each destination's channel queue (422 queue_empty or queue_full names the channel). With repeat (instant only) the post becomes occurrence 1 of a series that starts at that local time (422 invalid_repeat; 409 when the post is already in a series).",
  tags: ['posts'],
});

type ScheduleBody = z.output<typeof postScheduleRoute.body>;

export type ScheduleActor = Pick<RequestContext, 'principal' | 'now' | 'authorize'>;

export interface ScheduleScope {
  readonly workspaceId: string;
  readonly locked: CurrentPost;
  readonly units: readonly ScopeUnit[];
}

export interface ScheduleAuth {
  readonly approval: ApprovalStatus;
  authorize(approval: ApprovalStatus): void;
}

export interface ScheduleRun {
  readonly providers: ProviderRegistry;
  readonly now: Temporal.Instant;
  readonly workspaceId: string;
  readonly locked: CurrentPost;
  readonly auth: ScheduleAuth;
  readonly body: ScheduleBody;
  readonly only?: ReadonlySet<string>;
  readonly from?: ReadonlySet<string>;
  readonly kept?: ReadonlyMap<string, string>;
  readonly resetProgress?: ProgressReset;
}

interface Slot {
  readonly schedule: Schedule;
  readonly version: number;
  readonly deadline: Temporal.Instant;
  readonly approval: ApprovalStatus;
  readonly binding: Binding | undefined;
}

// The approval is only known once the content is frozen and hashed, so the role and scope are
// checked first and the approval again after the freeze, inside the same transaction.
export async function authorizeSchedule(
  trx: TenantDb,
  ctx: ScheduleActor,
  { workspaceId, locked, units }: ScheduleScope,
): Promise<ScheduleAuth> {
  const resource = { workspaceId, postId: locked.id, units };
  ctx.authorize('posts:schedule', resource, { approval: 'approved' });
  const approval = await approvalStatus(trx, workspaceId, locked, null);
  return {
    approval,
    authorize(final) {
      ctx.authorize('posts:schedule', resource, { approval: final });
    },
  };
}

function scheduledColumns(
  { locked }: ScheduleRun,
  f: Frozen,
  { schedule, version, deadline, approval, binding }: Slot,
): DestinationUpdate {
  return {
    ...FRESH_PUBLISH,
    ...bindingColumns(binding),
    frozen_at: sql<Date>`now()`,
    frozen_post_version: version,
    content_hash: f.contentHash,
    content_hash_v: CONTENT_HASH_V,
    frozen_signature: f.signature === null ? null : JSON.stringify(f.signature),
    agent_content: f.agentAuthored,
    brand_id_at_freeze: locked.brand_id,
    location_id_at_freeze: locked.location_id,
    scheduled_local: schedule.local.toString(),
    scheduled_tz: schedule.tz,
    scheduled_at: toDate(schedule.at),
    tz_resolution: schedule.resolution,
    tzdb_version: process.versions.tz ?? null,
    run_at: toDate(schedule.at),
    deadline_at: toDate(deadline),
    approval_required: approval !== 'exempt',
    preflight: JSON.stringify(f.preflight),
    preflight_acked_codes: [...f.ackedCodes],
  };
}

interface Prepared {
  readonly targets: readonly Target[];
  readonly frozen: readonly Frozen[];
  readonly schedules: ReadonlyMap<string, Schedule>;
}

async function approvalFor(trx: TenantDb, run: ScheduleRun, prepared: Prepared) {
  const { targets, frozen, schedules } = prepared;
  const resolved = await resolveApproval(trx, {
    workspaceId: run.workspaceId,
    postId: run.locked.id,
    targets: targets.map(({ row }) => ({
      id: row.id,
      kept: run.kept?.get(row.id) ?? row.approval_request_id,
    })),
    frozen,
    schedules,
    fallback: run.auth.approval,
  });
  run.auth.authorize(resolved.approval);
  if (resolved.approval !== 'approved' && frozen.some((f) => f.agentAuthored)) {
    throw new HttpError('approval_required', 'Agent-written content needs an approval.');
  }
  return resolved;
}

export async function scheduleLocked(
  trx: TenantDb,
  run: ScheduleRun,
  rows: readonly LockedDestination[],
): Promise<number> {
  const { workspaceId, locked, body, resetProgress = discardPublishProgress } = run;
  const postId = locked.id;
  const targets = draftTargets(rows, run);
  await refuseOpenRequest(trx, workspaceId, postId, WAITING);
  const timing = { workspaceId, postId, now: run.now };
  const schedules = await targetSchedules(trx, timing, body, targets);
  const set = postSchedule(body.mode, earliest(schedules));
  const version = await bumpPost(trx, workspaceId, postId, set);
  const frozen = await freezeTargets(trx, run, version, targets);
  const { approval, bindings } = await approvalFor(trx, run, { targets, frozen, schedules });
  await resetProgress(
    trx,
    workspaceId,
    targets.map(({ row }) => row.id),
  );
  for (const { row } of targets) {
    const f = frozen.find((candidate) => candidate.id === row.id);
    const schedule = schedules.get(row.id);
    if (f === undefined || schedule === undefined) {
      throw new Error(`destination ${row.id} was not frozen and timed`);
    }
    const deadline = schedule.at.add({ milliseconds: PUBLISH_DEADLINE_MS });
    const binding = bindings.get(row.id);
    await transition(trx, destinationRef(workspaceId, postId, row, version), {
      state: 'scheduled',
      reason: null,
      set: scheduledColumns(run, f, { schedule, version, deadline, approval, binding }),
    });
    await enqueuePublish(trx, { workspaceId, id: row.id }, schedule.at);
  }
  await recordPostSettlement(trx, workspaceId, postId);
  return version;
}

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
