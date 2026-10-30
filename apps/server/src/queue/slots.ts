import { encodePublicId, toDate } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { HttpError } from '../http/errors.ts';
import { resolveLocal, type Schedule } from '../posts/freeze.ts';

export const QUEUE_DAYS = 56;
const LEAD_MINUTES = 5;
const OCCUPYING = [
  'scheduled',
  'publishing',
  'retry_wait',
  'verifying',
  'published',
  'unconfirmed',
  'awaiting_manual',
];

export interface QueueSlot {
  readonly weekday: number;
  readonly time: Temporal.PlainTime;
}

export interface Timetable {
  readonly timezone: string | null;
  readonly slots: readonly QueueSlot[];
}

export interface QueueRef {
  readonly workspaceId: string;
  readonly accountId: string;
  readonly now: Temporal.Instant;
  readonly postId: string | null;
  readonly until?: Temporal.Instant;
}

export interface QueueTarget {
  readonly id: string;
  readonly social_account_id: string;
}

export async function lockQueues(trx: TenantDb, accountIds: readonly string[]): Promise<void> {
  for (const id of [...new Set(accountIds)].sort()) {
    await sql`select pg_advisory_xact_lock(hashtextextended(${`queue:${id}`}, 0))`.execute(trx);
  }
}

export async function loadTimetable(
  trx: TenantDb,
  workspaceId: string,
  accountId: string,
): Promise<Timetable> {
  const rows = await trx
    .selectFrom('queue_slots')
    .select(['weekday', 'local_time', 'timezone'])
    .where('workspace_id', '=', workspaceId)
    .where('social_account_id', '=', accountId)
    .orderBy('weekday')
    .orderBy('local_time')
    .execute();
  return {
    timezone: rows[0]?.timezone ?? null,
    slots: rows.map((row) => ({
      weekday: row.weekday,
      time: Temporal.PlainTime.from(row.local_time),
    })),
  };
}

export function candidates(
  timezone: string,
  slots: readonly QueueSlot[],
  now: Temporal.Instant,
  until?: Temporal.Instant,
): Schedule[] {
  const today = now.toZonedDateTimeISO(timezone).toPlainDate();
  const earliest = now.add({ minutes: LEAD_MINUTES });
  const seen = new Map<bigint, Schedule>();
  for (let day = 0; day < QUEUE_DAYS; day++) {
    const date = today.add({ days: day });
    for (const slot of slots) {
      if (slot.weekday !== date.dayOfWeek) continue;
      const schedule = resolveLocal(date.toPlainDateTime(slot.time), timezone);
      const key = schedule.at.epochNanoseconds;
      if (Temporal.Instant.compare(schedule.at, earliest) < 0 || seen.has(key)) continue;
      if (until !== undefined && Temporal.Instant.compare(schedule.at, until) > 0) continue;
      seen.set(key, schedule);
    }
  }
  return [...seen.values()].sort((a, b) => Temporal.Instant.compare(a.at, b.at));
}

// A copy waiting for approval is still a draft, but the evergreen fill bound it to its slot.
async function heldByCopies(trx: TenantDb, ref: QueueRef, window: readonly [Date, Date]) {
  let query = trx
    .selectFrom('evergreen_runs as r')
    .innerJoin('posts as c', (join) =>
      join.onRef('c.workspace_id', '=', 'r.workspace_id').onRef('c.id', '=', 'r.copy_post_id'),
    )
    .select('r.slot_at')
    .where('r.workspace_id', '=', ref.workspaceId)
    .where('r.social_account_id', '=', ref.accountId)
    .where('r.slot_at', '>=', window[0])
    .where('r.slot_at', '<=', window[1])
    .where('c.deleted_at', 'is', null)
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom('post_destinations as d')
          .select('d.id')
          .whereRef('d.workspace_id', '=', 'c.workspace_id')
          .whereRef('d.post_id', '=', 'c.id')
          .where('d.social_account_id', '=', ref.accountId)
          .where('d.state', '=', 'draft'),
      ),
    );
  if (ref.postId !== null) query = query.where('c.id', '<>', ref.postId);
  const rows = await query.execute();
  return rows.map(({ slot_at }) => slot_at.getTime());
}

async function occupied(
  trx: TenantDb,
  ref: QueueRef,
  list: readonly Schedule[],
): Promise<ReadonlySet<number>> {
  const first = list[0];
  const last = list.at(-1);
  if (first === undefined || last === undefined) return new Set();
  const window = [toDate(first.at), toDate(last.at)] as const;
  let query = trx
    .selectFrom('post_destinations')
    .select('scheduled_at')
    .where('workspace_id', '=', ref.workspaceId)
    .where('social_account_id', '=', ref.accountId)
    .where('state', 'in', OCCUPYING)
    .where('scheduled_at', '>=', window[0])
    .where('scheduled_at', '<=', window[1]);
  if (ref.postId !== null) query = query.where('post_id', '<>', ref.postId);
  const rows = await query.execute();
  const scheduled = rows.flatMap(({ scheduled_at }) => scheduled_at?.getTime() ?? []);
  return new Set([...scheduled, ...(await heldByCopies(trx, ref, window))]);
}

export interface FreeSlots {
  readonly timetable: Timetable;
  readonly free: readonly Schedule[];
}

export async function freeSlots(trx: TenantDb, ref: QueueRef, limit: number): Promise<FreeSlots> {
  const timetable = await loadTimetable(trx, ref.workspaceId, ref.accountId);
  if (timetable.timezone === null) return { timetable, free: [] };
  const all = candidates(timetable.timezone, timetable.slots, ref.now, ref.until);
  const taken = await occupied(trx, ref, all);
  const free = all.filter((s) => !taken.has(s.at.epochMilliseconds)).slice(0, limit);
  return { timetable, free };
}

function queueError(code: 'queue_empty' | 'queue_full', accountId: string): HttpError {
  const channel = encodePublicId('socialAccount', accountId);
  const message =
    code === 'queue_empty'
      ? `The queue of channel ${channel} has no slots.`
      : `The queue of channel ${channel} has no free slot in the next 8 weeks.`;
  return new HttpError('unprocessable', message, { details: [{ path: 'body.mode', code }] });
}

export interface QueueScope {
  readonly workspaceId: string;
  readonly postId: string;
  readonly now: Temporal.Instant;
}

export async function queueSchedules(
  trx: TenantDb,
  scope: QueueScope,
  targets: readonly QueueTarget[],
): Promise<ReadonlyMap<string, Schedule>> {
  const channels = [...new Set(targets.map((t) => t.social_account_id))].sort();
  await lockQueues(trx, channels);
  const picked = new Map<string, Schedule>();
  for (const accountId of channels) {
    const { timetable, free } = await freeSlots(trx, { ...scope, accountId }, 1);
    if (timetable.timezone === null) throw queueError('queue_empty', accountId);
    const [next] = free;
    if (next === undefined) throw queueError('queue_full', accountId);
    picked.set(accountId, next);
  }
  return new Map(
    targets.flatMap((t) => {
      const schedule = picked.get(t.social_account_id);
      return schedule === undefined ? [] : [[t.id, schedule] as const];
    }),
  );
}
