import { nextOccurrence, occurrenceAt, type RulePosition, type ScopeUnit } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { closeRequest } from '../approvals/locked.ts';
import { openApprovalRequest } from '../approvals/request.ts';
import { HttpError } from '../http/errors.ts';
import { plainLocal } from '../posts/dto.ts';
import { resolveLocal } from '../posts/freeze.ts';
import { type CurrentPost, lockCurrent, lockDestinations } from '../posts/locks.ts';
import { authorizeSchedule, scheduleLocked } from '../posts/schedule.ts';
import { postUnits } from '../posts/units.ts';
import type { ProviderRegistry } from '../providers.ts';
import { approvalStatus } from '../publish/principal.ts';
import { cloneOccurrence } from './clone.ts';
import { actAs, type OwnerActing, ownerActing } from './owner.ts';
import {
  latestOccurrence,
  type Occurrence,
  occurrenceInstant,
  ruleSeriesOf,
  type SeriesRow,
} from './store.ts';

export type StepOutcome = 'idle' | 'cloned' | 'requested' | 'scheduled' | 'ended';

export interface StepEnv {
  readonly providers: ProviderRegistry;
  readonly now: Temporal.Instant;
  readonly workspaceId: string;
}

interface Turn {
  readonly env: StepEnv;
  readonly row: SeriesRow;
  readonly acting: OwnerActing;
  readonly locked: CurrentPost;
  readonly units: readonly ScopeUnit[];
  readonly latest: Occurrence;
}

type EndReason = 'count_reached' | 'until_passed' | 'occurrences_deleted' | null;

async function end(trx: TenantDb, env: StepEnv, row: SeriesRow, reason: EndReason) {
  await trx
    .updateTable('post_series')
    .set({ state: 'ended', state_reason: reason, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', env.workspaceId)
    .where('id', '=', row.id)
    .execute();
  return 'ended' as const;
}

function endReason(row: SeriesRow, position: RulePosition): EndReason {
  const { count, until } = ruleSeriesOf(row).rule;
  if (count !== undefined && position.index >= count) return 'count_reached';
  return until === undefined ? null : 'until_passed';
}

// After downtime the instants already past are skipped rather than created as missed drafts.
function nextFuture(turn: Turn): { position: RulePosition; next: Temporal.PlainDateTime | null } {
  const { row, env } = turn;
  const series = ruleSeriesOf(row);
  const start = occurrenceAt(series, row.occurrences) ?? series.dtstart;
  let position: RulePosition = { index: row.occurrences, local: start };
  let next = nextOccurrence(series, position);
  while (
    next !== null &&
    Temporal.Instant.compare(resolveLocal(next, row.timezone).at, env.now) <= 0
  ) {
    position = { index: position.index + 1, local: next };
    next = nextOccurrence(series, position);
  }
  return { position, next };
}

async function advancePast(trx: TenantDb, turn: Turn): Promise<StepOutcome> {
  const { row, env } = turn;
  const { position, next } = nextFuture(turn);
  if (turn.latest.publish_summary === 'in_review') {
    const voided = { state: 'voided', reason: 'schedule_changed' } as const;
    await closeRequest(trx, env.workspaceId, { postId: turn.latest.id }, voided);
  }
  if (next === null) return await end(trx, env, row, endReason(row, position));
  await cloneOccurrence(
    trx,
    { providers: env.providers, acting: turn.acting },
    { workspaceId: env.workspaceId, series: row, sourceId: turn.latest.id, local: next },
  );
  await trx
    .updateTable('post_series')
    .set({ occurrences: position.index + 1, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', env.workspaceId)
    .where('id', '=', row.id)
    .execute();
  return 'cloned';
}

async function newestRequest(trx: TenantDb, workspaceId: string, postId: string) {
  return await trx
    .selectFrom('approval_requests')
    .select(['id', 'state'])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(1)
    .executeTakeFirst();
}

function intendedSchedule(latest: Occurrence) {
  const scheduleLocal = plainLocal(latest.schedule_local);
  const scheduleTz = latest.schedule_tz;
  return scheduleLocal === null || scheduleTz === null ? null : { scheduleLocal, scheduleTz };
}

async function schedule(
  trx: TenantDb,
  turn: Turn,
  at: { scheduleLocal: string; scheduleTz: string },
) {
  const { env, locked, units, acting } = turn;
  const { workspaceId } = env;
  const auth = await authorizeSchedule(trx, acting, { workspaceId, locked, units });
  const rows = await lockDestinations(trx, workspaceId, locked.id);
  const body = { mode: 'instant' as const, expectedVersion: locked.version, ...at };
  const run = { providers: env.providers, now: env.now, workspaceId, locked, auth, body };
  await scheduleLocked(trx, run, rows);
  return 'scheduled' as const;
}

async function request(
  trx: TenantDb,
  turn: Turn,
  at: { scheduleLocal: string; scheduleTz: string },
) {
  const { env, locked, units, acting } = turn;
  acting.authorize('posts:submit', { workspaceId: env.workspaceId, postId: locked.id, units });
  await openApprovalRequest(trx, acting, {
    providers: env.providers,
    workspaceId: env.workspaceId,
    locked,
    schedule: at,
    note: undefined,
  });
  return 'requested' as const;
}

// An approval covers the content and time it was given for (ADR-0011); after an edit the owner asks again.
async function scheduleApproved(
  trx: TenantDb,
  turn: Turn,
  at: { scheduleLocal: string; scheduleTz: string },
): Promise<StepOutcome> {
  await sql`savepoint series_schedule`.execute(trx);
  try {
    const outcome = await schedule(trx, turn, at);
    await sql`release savepoint series_schedule`.execute(trx);
    return outcome;
  } catch (err) {
    if (!(err instanceof HttpError) || err.code !== 'approval_required') throw err;
    await sql`rollback to savepoint series_schedule`.execute(trx);
    return await request(trx, turn, at);
  }
}

// A request someone rejected, withdrew or voided is theirs to follow up; the job asks only once.
async function settleDraft(trx: TenantDb, turn: Turn): Promise<StepOutcome> {
  const { env, locked, units, acting, latest } = turn;
  const at = intendedSchedule(latest);
  if (latest.publish_summary !== 'draft' || at === null) return 'idle';
  const newest = await newestRequest(trx, env.workspaceId, locked.id);
  if (newest?.state === 'approved') return await scheduleApproved(trx, turn, at);
  const approval = await approvalStatus(trx, env.workspaceId, locked, null);
  const resource = { workspaceId: env.workspaceId, postId: locked.id, units };
  const decision = acting.decide('posts:schedule', resource, approval);
  const needsRequest = decision.kind === 'require_approval' || latest.agent_dirty;
  if (!needsRequest) return await schedule(trx, turn, at);
  if (newest !== undefined) return 'idle';
  return await request(trx, turn, at);
}

export async function stepSeries(
  trx: TenantDb,
  env: StepEnv,
  row: SeriesRow,
): Promise<StepOutcome> {
  const { workspaceId, now } = env;
  const found = await latestOccurrence(trx, workspaceId, row.id);
  if (found === undefined) return await end(trx, env, row, 'occurrences_deleted');
  const acting = await ownerActing(trx, workspaceId, row, now);
  const locked = await lockCurrent(trx, workspaceId, found.id);
  const latest = await latestOccurrence(trx, workspaceId, row.id);
  if (latest?.id !== found.id) return 'idle';
  const units = await postUnits(trx, workspaceId, locked);
  acting.decide('posts:schedule', { workspaceId, postId: locked.id, units }, 'approved');
  await actAs(trx, acting.actor);
  const turn: Turn = { env, row, acting, locked, units, latest };
  const at = await occurrenceInstant(trx, workspaceId, row, latest);
  if (at !== null && Temporal.Instant.compare(at, now) <= 0) return await advancePast(trx, turn);
  return await settleDraft(trx, turn);
}
