import { nextOccurrence, occurrenceAt, type RulePosition } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { closeRequest } from '../approvals/locked.ts';
import { clonePost } from '../posts/clone.ts';
import { plainLocal } from '../posts/dto.ts';
import { resolveLocal } from '../posts/freeze.ts';
import { lockCurrent } from '../posts/locks.ts';
import { actAs, ownerActing } from '../posts/owner.ts';
import {
  type LocalAt,
  needsRequest,
  newestRequest,
  type OwnerEnv,
  type OwnerTurn,
  requestAsOwner,
  scheduleAsOwner,
  scheduleOrRequest,
} from '../posts/owner-schedule.ts';
import { postUnits } from '../posts/units.ts';
import {
  latestOccurrence,
  type Occurrence,
  occurrenceInstant,
  ruleSeriesOf,
  type SeriesRow,
} from './store.ts';

export type StepOutcome = 'idle' | 'cloned' | 'requested' | 'scheduled' | 'ended';

export type StepEnv = OwnerEnv;

interface Turn extends OwnerTurn {
  readonly row: SeriesRow;
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
  await clonePost(
    trx,
    { providers: env.providers, acting: turn.acting },
    {
      workspaceId: env.workspaceId,
      sourceId: turn.latest.id,
      origin: 'recurrence',
      owner: row,
      at: { local: next, timezone: row.timezone },
      seriesId: row.id,
    },
  );
  await trx
    .updateTable('post_series')
    .set({ occurrences: position.index + 1, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', env.workspaceId)
    .where('id', '=', row.id)
    .execute();
  return 'cloned';
}

function intendedSchedule(latest: Occurrence): LocalAt | null {
  const scheduleLocal = plainLocal(latest.schedule_local);
  const scheduleTz = latest.schedule_tz;
  return scheduleLocal === null || scheduleTz === null ? null : { scheduleLocal, scheduleTz };
}

// A request someone rejected, withdrew or voided is theirs to follow up; the job asks only once.
async function settleDraft(trx: TenantDb, turn: Turn): Promise<StepOutcome> {
  const { env, locked, latest } = turn;
  const at = intendedSchedule(latest);
  if (latest.publish_summary !== 'draft' || at === null) return 'idle';
  const newest = await newestRequest(trx, env.workspaceId, locked.id);
  if (newest?.state === 'approved') return await scheduleOrRequest(trx, turn, at);
  if (!(await needsRequest(trx, turn, latest.agent_dirty))) {
    return await scheduleAsOwner(trx, turn, at);
  }
  if (newest !== undefined) return 'idle';
  return await requestAsOwner(trx, turn, at);
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
