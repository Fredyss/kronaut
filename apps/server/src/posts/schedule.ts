import { CONTENT_HASH_V } from '@kronaut/compose';
import { defineRoute } from '@kronaut/contract';
import { type ApprovalStatus, PUBLISH_DEADLINE_MS, type ScopeUnit } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { type Binding, bindingColumns, resolveApproval } from '../approvals/binding.ts';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import { enqueuePublish } from '../jobs.ts';
import type { ProviderRegistry } from '../providers.ts';
import { type DestinationUpdate, transition } from '../publish/finalize.ts';
import { approvalStatus } from '../publish/principal.ts';
import { recordPostSettlement } from '../webhooks/events.ts';
import type { PostRouteDeps } from './deps.ts';
import { discardPublishProgress, type ProgressReset } from './destinations.ts';
import { PostSchema, readPost } from './dto.ts';
import { FRESH_PUBLISH, type Frozen, type Schedule } from './freeze.ts';
import {
  bumpPost,
  type CurrentPost,
  checkVersion,
  destinationRef,
  type LockedDestination,
  lockCurrent,
  lockDestinations,
} from './locks.ts';
import { ExpectedVersion, PostParams, pathId } from './params.ts';
import {
  draftTargets,
  freezeTargets,
  postSchedule,
  refuseOpenRequest,
  scheduleOf,
  type Target,
} from './targets.ts';
import { postUnits } from './units.ts';

const IANA_TZ = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/;
const WAITING = 'The post is waiting for approval.';

export const ScheduleCommon = {
  expectedVersion: ExpectedVersion,
  acknowledgedCodes: z
    .array(z.string().regex(/^[a-z_]{1,64}$/))
    .max(32)
    .optional(),
};

export const InstantFields = {
  scheduleLocal: z.iso.datetime({ local: true }),
  scheduleTz: z.string().max(64).regex(IANA_TZ),
};

export const postScheduleRoute = defineRoute({
  id: 'posts.schedule',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/posts/:postId/schedule',
  auth: ['session', 'grant'],
  action: 'posts:schedule',
  params: PostParams,
  body: z.discriminatedUnion('mode', [
    z.object({ ...ScheduleCommon, mode: z.literal('instant'), ...InstantFields }),
    z.strictObject({ ...ScheduleCommon, mode: z.literal('asap') }),
  ]),
  response: PostSchema,
  idempotency: true,
  summary: 'Schedule a post',
  description:
    'Freezes every draft destination and schedules it, at a local time in a time zone or as soon as possible.',
  tags: ['posts'],
});

type ScheduleBody = z.output<typeof postScheduleRoute.body>;

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

function toDate(instant: Temporal.Instant): Date {
  return new Date(instant.epochMilliseconds);
}

// The approval is only known once the content is frozen and hashed, so the role and scope are
// checked first and the approval again after the freeze, inside the same transaction.
export async function authorizeSchedule(
  trx: TenantDb,
  ctx: RequestContext,
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
  readonly schedule: Schedule;
}

async function approvalFor(trx: TenantDb, run: ScheduleRun, prepared: Prepared) {
  const { targets, frozen, schedule } = prepared;
  const resolved = await resolveApproval(trx, {
    workspaceId: run.workspaceId,
    postId: run.locked.id,
    targets: targets.map(({ row }) => ({
      id: row.id,
      kept: run.kept?.get(row.id) ?? row.approval_request_id,
    })),
    frozen,
    schedule,
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
  const schedule = await scheduleOf(trx, workspaceId, body, run.now);
  const version = await bumpPost(trx, workspaceId, postId, postSchedule(body.mode, schedule));
  const frozen = await freezeTargets(trx, run, version, targets);
  const { approval, bindings } = await approvalFor(trx, run, { targets, frozen, schedule });
  const deadline = schedule.at.add({ milliseconds: PUBLISH_DEADLINE_MS });
  await resetProgress(
    trx,
    workspaceId,
    targets.map(({ row }) => row.id),
  );
  for (const { row } of targets) {
    const f = frozen.find((candidate) => candidate.id === row.id);
    if (f === undefined) throw new Error(`destination ${row.id} was not frozen`);
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
        return await readPost(trx, workspaceId, postId);
      });
      return { body: post };
    }),
  ];
}
