import type { Actor, Database } from '@kronaut/db';
import { sql } from 'kysely';

const SYSTEM: Actor = { kind: 'system' };
const DETAIL_MAX = 500;
const runningTasks = new Set<string>();

async function recordRun(db: Database, task: string, run: () => Promise<string>): Promise<void> {
  const { id } = await db.withActor(SYSTEM, (trx) =>
    trx.insertInto('cron_runs').values({ task }).returning('id').executeTakeFirstOrThrow(),
  );
  let outcome: 'ok' | 'error' = 'error';
  let detail = '';
  try {
    detail = await run();
    outcome = 'ok';
  } catch (err) {
    detail = err instanceof Error ? err.message : 'failed';
    throw err;
  } finally {
    await db.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('cron_runs')
        .set({ finished_at: sql<Date>`now()`, outcome, detail: detail.slice(0, DETAIL_MAX) })
        .where('id', '=', id)
        .execute(),
    );
  }
}

// In parallel a slow task could overlap its next tick and, say, send a mail twice. A shared
// graphile queue would prevent that, but a killed worker leaves one locked for 4 h, which would
// stop the lease reaper; this guard dies with the process.
export async function recordCronRun(
  db: Database,
  task: string,
  run: () => Promise<string>,
): Promise<void> {
  if (runningTasks.has(task)) return;
  runningTasks.add(task);
  try {
    await recordRun(db, task, run);
  } finally {
    runningTasks.delete(task);
  }
}
