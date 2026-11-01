import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type { Actor, Database, TenantDb } from '@kronaut/db';
import type { WorkerEvents } from 'graphile-worker';
import { sql } from 'kysely';
import type { Logger } from 'pino';

const SYSTEM: Actor = { kind: 'system' };
const SWEEP_INTERVAL_MS = 30_000;
const STALE_AFTER_SECONDS = 120;
const SESSION_PREFIX = 'kronaut-jobs-';

export interface JobSession {
  readonly id: string;
  readonly connectionString: string;
  readonly events: WorkerEvents;
  poolId: string | null;
}

export interface LockSweep {
  stop(): Promise<void>;
}

// The docs speak of worker ids, but graphile 0.18 locks jobs and queues under the random pool id
export function openJobSession(databaseUrl: string): JobSession {
  const id = randomUUID();
  const url = new URL(databaseUrl);
  url.searchParams.set('application_name', `${SESSION_PREFIX}${id}`);
  const events = new EventEmitter() as WorkerEvents;
  const session: JobSession = { id, connectionString: url.toString(), events, poolId: null };
  events.on('pool:create', ({ workerPool }) => {
    session.poolId = workerPool.id;
  });
  return session;
}

const sessionConnected = sql<boolean>`exists (
  select 1 from pg_stat_activity a
   where a.application_name = ${SESSION_PREFIX} || h.job_session::text
)`;

async function forceUnlock(trx: TenantDb, poolIds: readonly string[]): Promise<void> {
  if (poolIds.length === 0) return;
  await sql`select graphile_worker.force_unlock_workers(${poolIds}::text[])`.execute(trx);
}

interface Pools {
  readonly job_pool_id: string | null;
}

function poolIdsOf(rows: readonly Pools[]): string[] {
  return rows.flatMap((row) => row.job_pool_id ?? []);
}

// A restarted container keeps its worker id, so its row still names the previous process. An id
// shared by two live processes keeps its session connected and is left for graphile's own expiry.
export async function registerJobWorkers(
  db: Database,
  workerId: string,
  session: JobSession,
): Promise<void> {
  await db.withActor(SYSTEM, async (trx) => {
    const { rows } = await sql<Pools>`
      select h.job_pool_id from worker_heartbeats h
       where h.worker_id = ${workerId} and not ${sessionConnected}
         for update of h
    `.execute(trx);
    await forceUnlock(trx, poolIdsOf(rows));
    await trx
      .updateTable('worker_heartbeats')
      .set({ job_session: session.id, job_pool_id: session.poolId })
      .where('worker_id', '=', workerId)
      .execute();
  });
}

// A dead worker has both a stale heartbeat and no connection. A stalled or partitioned one keeps
// its connection, and after a Postgres restart the floor gives every live worker time to return.
export function releaseDeadJobWorkers(
  db: Database,
  staleAfterSeconds = STALE_AFTER_SECONDS,
): Promise<string[]> {
  return db.withActor(SYSTEM, async (trx) => {
    const { rows } = await sql<Pools & { worker_id: string }>`
      select h.worker_id, h.job_pool_id from worker_heartbeats h
       where h.job_session is not null
         and greatest(h.seen_at, pg_postmaster_start_time())
             < now() - make_interval(secs => ${staleAfterSeconds})
         and not ${sessionConnected}
         for update of h skip locked
    `.execute(trx);
    const released = poolIdsOf(rows);
    await forceUnlock(trx, released);
    if (rows.length > 0) {
      await trx
        .updateTable('worker_heartbeats')
        .set({ job_session: null, job_pool_id: null })
        .where(
          'worker_id',
          'in',
          rows.map((row) => row.worker_id),
        )
        .execute();
    }
    return released;
  });
}

export function startLockSweep(db: Database, logger: Logger): LockSweep {
  const sweep = (): Promise<void> =>
    releaseDeadJobWorkers(db)
      .then((released) => {
        if (released.length > 0) logger.warn({ released }, 'released locks of dead job workers');
      })
      .catch((err: unknown) => logger.warn({ err }, 'job lock sweep failed'))
      .finally(() => {
        pending = null;
      });
  let pending: Promise<void> | null = sweep();
  const timer = setInterval(() => {
    pending ??= sweep();
  }, SWEEP_INTERVAL_MS);
  timer.unref();
  return {
    stop: async () => {
      clearInterval(timer);
      await pending;
    },
  };
}
