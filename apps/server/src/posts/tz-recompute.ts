import type { Actor, Database, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { enqueuePublish } from '../jobs.ts';
import { resolveLocal } from './freeze.ts';

const TASK = 'tz_recompute';
const WORKSPACE_PAGE = 1000;
const BATCH = 1000;
const SYSTEM: Actor = { kind: 'system' };

interface Counts {
  checked: number;
  moved: number;
  failed: number;
}

function instant(date: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

function toDate(at: Temporal.Instant): Date {
  return new Date(at.epochMilliseconds);
}

function lockStale(trx: TenantDb, workspaceId: string, tzdb: string, batch: number) {
  return trx
    .selectFrom('post_destinations')
    .select(['id', 'version', 'scheduled_local', 'scheduled_tz', 'scheduled_at', 'deadline_at'])
    .where('workspace_id', '=', workspaceId)
    .where('state', '=', 'scheduled')
    .where('scheduled_local', 'is not', null)
    .where('scheduled_tz', 'is not', null)
    .where(sql<boolean>`tzdb_version is distinct from ${tzdb}`)
    .where('lease_until', 'is', null)
    .where('claimed_attempt_id', 'is', null)
    .where(({ not, exists, selectFrom }) =>
      not(
        exists(
          selectFrom('publish_attempts as a')
            .select(sql`1`.as('one'))
            .whereRef('a.workspace_id', '=', 'post_destinations.workspace_id')
            .whereRef('a.destination_id', '=', 'post_destinations.id')
            .where('a.finished_at', 'is', null),
        ),
      ),
    )
    .orderBy('id')
    .limit(batch)
    .forUpdate()
    .skipLocked()
    .execute();
}

type StaleRow = Awaited<ReturnType<typeof lockStale>>[number];

async function recomputeRow(
  trx: TenantDb,
  workspaceId: string,
  row: StaleRow,
  tzdb: string,
): Promise<boolean> {
  const { scheduled_local: local, scheduled_tz: tz, scheduled_at: at, deadline_at: deadline } = row;
  if (local === null || tz === null || at === null || deadline === null) {
    throw new Error(`scheduled destination ${row.id} has no schedule`);
  }
  const schedule = resolveLocal(Temporal.PlainDateTime.from(local.replace(' ', 'T')), tz);
  const update = trx
    .updateTable('post_destinations')
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', row.id);
  const old = instant(at);
  if (Temporal.Instant.compare(schedule.at, old) === 0) {
    await update.set({ tzdb_version: tzdb }).execute();
    return false;
  }
  const delta = old.until(schedule.at);
  await update
    .set({
      version: row.version + 1,
      scheduled_at: toDate(schedule.at),
      run_at: toDate(schedule.at),
      deadline_at: toDate(instant(deadline).add(delta)),
      tz_resolution: schedule.resolution,
      tzdb_version: tzdb,
    })
    .execute();
  await enqueuePublish(trx, { workspaceId, id: row.id }, schedule.at);
  return true;
}

async function recomputeWorkspace(
  db: Database,
  workspaceId: string,
  tzdb: string,
  counts: Counts,
): Promise<void> {
  for (;;) {
    const batch = await db.withTenant(workspaceId, SYSTEM, async (trx) => {
      const rows = await lockStale(trx, workspaceId, tzdb, BATCH);
      let moved = 0;
      for (const row of rows) {
        if (await recomputeRow(trx, workspaceId, row, tzdb)) moved++;
      }
      return { checked: rows.length, moved };
    });
    counts.checked += batch.checked;
    counts.moved += batch.moved;
    if (batch.checked < BATCH) return;
  }
}

export async function recomputeTimes(
  db: Database,
  logger: Logger,
  tzdb: string | undefined = process.versions.tz,
): Promise<string> {
  if (tzdb === undefined) return 'skipped';
  const counts: Counts = { checked: 0, moved: 0, failed: 0 };
  let after: string | null = null;
  for (;;) {
    const page = await db.sweeps.workspaces(after, WORKSPACE_PAGE);
    for (const workspaceId of page) {
      try {
        await recomputeWorkspace(db, workspaceId, tzdb, counts);
      } catch (err) {
        counts.failed++;
        logger.error({ err, task: TASK, workspaceId }, 'tz recompute failed for a workspace');
      }
    }
    after = page.at(-1) ?? null;
    if (page.length < WORKSPACE_PAGE) break;
  }
  if (counts.moved > 0) {
    logger.warn({ task: TASK, moved: counts.moved, tzdb }, 'tzdata update moved scheduled posts');
  }
  const detail = `tzdb ${tzdb}: checked ${counts.checked}, moved ${counts.moved}`;
  if (counts.failed > 0) throw new Error(`${detail}, failed in ${counts.failed} workspaces`);
  return detail;
}
