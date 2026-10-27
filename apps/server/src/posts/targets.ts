import type { DB, TenantDb } from '@kronaut/db';
import type { UpdateObject } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { HttpError } from '../http/errors.ts';
import type { ProviderRegistry } from '../providers.ts';
import { type Frozen, freeze, resolveLocal, type Schedule, scheduleAt } from './freeze.ts';
import { unprocessable } from './issues.ts';
import type { CurrentPost, LockedDestination } from './locks.ts';

const PAST_GRACE_SECONDS = 60;
const DRAFT_ONLY: ReadonlySet<string> = new Set(['draft']);

export type ScheduleSpec =
  | { readonly mode: 'asap' }
  | { readonly mode: 'instant'; readonly scheduleLocal: string; readonly scheduleTz: string };

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
  spec: ScheduleSpec,
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

export function postSchedule(
  mode: ScheduleSpec['mode'],
  schedule: Schedule,
): UpdateObject<DB, 'posts'> {
  return mode === 'instant'
    ? {
        schedule_mode: 'instant',
        schedule_local: schedule.local.toString(),
        schedule_tz: schedule.tz,
      }
    : { schedule_mode: 'asap', schedule_local: null, schedule_tz: null };
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
