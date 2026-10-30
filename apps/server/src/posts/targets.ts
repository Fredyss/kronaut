import { resolveLocal, type Schedule, scheduleAt } from '@kronaut/core';
import type { DB, TenantDb } from '@kronaut/db';
import type { UpdateObject } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { HttpError } from '../http/errors.ts';
import { unprocessable } from '../http/issues.ts';
import type { ProviderRegistry } from '../providers.ts';
import { queueSchedules } from '../queue/slots.ts';
import { type Frozen, freeze } from './freeze.ts';
import type { CurrentPost, LockedDestination } from './locks.ts';

const PAST_GRACE_SECONDS = 60;
const DRAFT_ONLY: ReadonlySet<string> = new Set(['draft']);

export type FixedSpec =
  | { readonly mode: 'asap' }
  | { readonly mode: 'instant'; readonly scheduleLocal: string; readonly scheduleTz: string };

export type ScheduleSpec = FixedSpec | { readonly mode: 'queue' };

export interface ScheduleTiming {
  readonly workspaceId: string;
  readonly postId: string;
  readonly now: Temporal.Instant;
}

export interface Target {
  readonly row: LockedDestination;
  readonly index: number;
}

export interface TargetFilter {
  readonly only?: ReadonlySet<string>;
  readonly from?: ReadonlySet<string>;
}

export interface FreezeScope {
  readonly providers: ProviderRegistry;
  readonly workspaceId: string;
  readonly locked: CurrentPost;
  readonly body: { readonly acknowledgedCodes?: readonly string[] | undefined };
  readonly reason?: 'submit';
}

export async function scheduleOf(
  trx: TenantDb,
  workspaceId: string,
  spec: FixedSpec,
  now: Temporal.Instant,
): Promise<Schedule> {
  if (spec.mode === 'asap') {
    const { timezone } = await trx
      .selectFrom('workspaces')
      .select('timezone')
      .where('id', '=', workspaceId)
      .executeTakeFirstOrThrow();
    return scheduleAt(now, timezone);
  }
  let schedule: Schedule;
  try {
    schedule = resolveLocal(Temporal.PlainDateTime.from(spec.scheduleLocal), spec.scheduleTz);
  } catch (err) {
    if (!(err instanceof RangeError)) throw err;
    throw unprocessable([{ path: 'body.scheduleTz', code: 'invalid_time_zone' }]);
  }
  if (Temporal.Instant.compare(schedule.at, now.subtract({ seconds: PAST_GRACE_SECONDS })) < 0) {
    throw unprocessable([{ path: 'body.scheduleLocal', code: 'in_past' }]);
  }
  return schedule;
}

export async function targetSchedules(
  trx: TenantDb,
  timing: ScheduleTiming,
  spec: ScheduleSpec,
  targets: readonly Target[],
): Promise<ReadonlyMap<string, Schedule>> {
  const rows = targets.map(({ row }) => row);
  if (spec.mode === 'queue') return await queueSchedules(trx, timing, rows);
  const schedule = await scheduleOf(trx, timing.workspaceId, spec, timing.now);
  return new Map(rows.map((row) => [row.id, schedule]));
}

export function earliest(schedules: ReadonlyMap<string, Schedule>): Schedule {
  const [first, ...rest] = schedules.values();
  if (first === undefined) throw new Error('no destination has a schedule');
  return rest.reduce((min, s) => (Temporal.Instant.compare(s.at, min.at) < 0 ? s : min), first);
}

export function postSchedule(
  mode: ScheduleSpec['mode'],
  schedule: Schedule,
): UpdateObject<DB, 'posts'> {
  if (mode === 'asap') return { schedule_mode: 'asap', schedule_local: null, schedule_tz: null };
  return {
    schedule_mode: mode === 'queue' ? 'local_per_destination' : 'instant',
    schedule_local: schedule.local.toString(),
    schedule_tz: schedule.tz,
  };
}

export function draftTargets(
  rows: readonly LockedDestination[],
  { only, from = DRAFT_ONLY }: TargetFilter,
): Target[] {
  const targets = rows.flatMap((row, index) =>
    from.has(row.state) && (only === undefined || only.has(row.id)) ? [{ row, index }] : [],
  );
  if (targets.length === 0) {
    throw new HttpError('conflict', 'The post has no draft destination to schedule.');
  }
  return targets;
}

export async function freezeTargets(
  trx: TenantDb,
  scope: FreezeScope,
  version: number,
  targets: readonly Target[],
): Promise<Frozen[]> {
  return await freeze(trx, scope.providers, {
    workspaceId: scope.workspaceId,
    postId: scope.locked.id,
    postVersion: version,
    targets: targets.map(({ row, index }) => ({
      id: row.id,
      index,
      socialAccountId: row.social_account_id,
      provider: row.provider,
      publishType: row.publish_type,
      deliveryMode: row.delivery_mode,
      settings: row.settings,
      variantId: row.variant_id,
    })),
    acknowledged: new Set(scope.body.acknowledgedCodes ?? []),
    reason: scope.reason ?? 'schedule',
  });
}

export async function refuseOpenRequest(
  trx: TenantDb,
  workspaceId: string,
  postId: string,
  message: string,
): Promise<void> {
  const open = await trx
    .selectFrom('approval_requests')
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .where('state', '=', 'open')
    .executeTakeFirst();
  if (open !== undefined) throw new HttpError('conflict', message);
}
