import { randomUUID } from 'node:crypto';
import { encodePublicId } from '@kronaut/core';
import type { Actor, Database, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import { HttpError } from '../http/errors.ts';
import type { ProviderRegistry } from '../providers.ts';
import { actAs, OwnerLost } from './owner.ts';
import { type StepOutcome, stepSeries } from './step.ts';
import { type SeriesRow, seriesRows } from './store.ts';

const TASK = 'series_advance';
const WORKSPACE_PAGE = 1000;
const BATCH = 20;
const SYSTEM: Actor = { kind: 'system' };

export interface AdvanceDeps {
  readonly db: Database;
  readonly logger: Logger;
  readonly providers: ProviderRegistry;
  readonly now: () => Temporal.Instant;
}

type Counts = Record<StepOutcome | 'checked' | 'paused' | 'failed', number>;

interface Run {
  readonly deps: AdvanceDeps;
  readonly now: Temporal.Instant;
  readonly counts: Counts;
}

function lockActive(trx: TenantDb, workspaceId: string, after: string | null) {
  return seriesRows(trx, workspaceId)
    .where('state', '=', 'active')
    .$if(after !== null, (qb) => qb.where('id', '>', after as string))
    .orderBy('id')
    .limit(BATCH)
    .forUpdate()
    .skipLocked()
    .execute();
}

type PauseReason = 'owner_lost' | 'advance_failed';

// A client error repeats on every tick until someone changes the occurrence, so retrying only fails the run again.
function pauseReason(err: unknown): PauseReason | null {
  if (err instanceof OwnerLost) return 'owner_lost';
  if (err instanceof HttpError && err.status >= 400 && err.status < 500) return 'advance_failed';
  return null;
}

function errorCode(err: unknown): string {
  if (err instanceof OwnerLost) return 'owner_lost';
  return err instanceof HttpError ? err.code : 'error';
}

async function pause(trx: TenantDb, workspaceId: string, row: SeriesRow, err: unknown) {
  const reason = pauseReason(err);
  if (reason === null) return false;
  await trx
    .updateTable('post_series')
    .set({ state: 'paused', state_reason: reason, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', row.id)
    .execute();
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: workspaceId,
      actor_kind: 'system',
      surface: 'worker',
      action: 'series.paused',
      resource_kind: 'post_series',
      resource_id: row.id,
      outcome: 'ok',
      error_code: errorCode(err),
      args_summary: JSON.stringify({ reason }),
      correlation_id: randomUUID(),
    })
    .execute();
  return true;
}

// One series that cannot advance must not roll back, and so block, the rest of its batch.
async function advanceIsolated(
  trx: TenantDb,
  workspaceId: string,
  row: SeriesRow,
  run: Run,
): Promise<void> {
  await sql`savepoint series_row`.execute(trx);
  try {
    const env = { providers: run.deps.providers, now: run.now, workspaceId };
    run.counts[await stepSeries(trx, env, row)]++;
    await sql`release savepoint series_row`.execute(trx);
    await actAs(trx, SYSTEM);
  } catch (err) {
    await sql`rollback to savepoint series_row`.execute(trx);
    await actAs(trx, SYSTEM);
    const series = encodePublicId('series', row.id);
    const log = { task: TASK, series, code: errorCode(err) };
    if (await pause(trx, workspaceId, row, err)) {
      run.counts.paused++;
      run.deps.logger.warn(log, 'a series was paused');
    } else {
      run.counts.failed++;
      run.deps.logger.error(log, 'a series could not advance');
    }
  }
}

async function advanceWorkspace(run: Run, workspaceId: string): Promise<void> {
  let after: string | null = null;
  for (;;) {
    const cursor = after;
    const rows = await run.deps.db.withTenant(workspaceId, SYSTEM, async (trx) => {
      const active = await lockActive(trx, workspaceId, cursor);
      for (const row of active) await advanceIsolated(trx, workspaceId, row, run);
      return active;
    });
    run.counts.checked += rows.length;
    after = rows.at(-1)?.id ?? null;
    if (rows.length < BATCH) return;
  }
}

export async function advanceSeries(deps: AdvanceDeps): Promise<string> {
  const counts: Counts = {
    checked: 0,
    idle: 0,
    cloned: 0,
    requested: 0,
    scheduled: 0,
    ended: 0,
    paused: 0,
    failed: 0,
  };
  const run: Run = { deps, now: deps.now(), counts };
  let after: string | null = null;
  for (;;) {
    const page = await deps.db.sweeps.workspaces(after, WORKSPACE_PAGE);
    for (const workspaceId of page) {
      try {
        await advanceWorkspace(run, workspaceId);
      } catch {
        counts.failed++;
        deps.logger.error({ task: TASK }, 'series advance failed for a workspace');
      }
    }
    after = page.at(-1) ?? null;
    if (page.length < WORKSPACE_PAGE) break;
  }
  const detail = JSON.stringify(counts);
  if (counts.failed > 0) throw new Error(detail);
  return detail;
}
