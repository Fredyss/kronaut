import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { setTimeout as sleep } from 'node:timers/promises';
import type { Actor, Database, TenantDb } from '@kronaut/db';
import type { WorkerEvents } from 'graphile-worker';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { Temporal } from 'temporal-polyfill';

const SYSTEM: Actor = { kind: 'system' };
const SWEEP_INTERVAL_MS = 30_000;
const STALE_AFTER_SECONDS = 120;
const SESSION_PREFIX = 'kronaut-jobs-';
const OWN_SESSION_WAIT_MS = 5_000;
const OWN_SESSION_POLL_MS = 100;

export interface JobSession {
  readonly id: string;
  readonly connectionString: string;
  readonly events: WorkerEvents;
  poolId: string | null;
  visibleSince: number | null;
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
  const session: JobSession = {
    id,
    connectionString: url.toString(),
    events,
    poolId: null,
    visibleSince: null,
  };
  events.on('pool:create', ({ workerPool }) => {
    session.poolId = workerPool.id;
  });
  return session;
}

const sessionConnected = sql<boolean>`exists (
  select 1 from pg_stat_activity a
   where a.application_name = ${SESSION_PREFIX} || h.job_session::text
)`;

// A pooler that drops application_name shows a live worker as gone. Only a reader that can see its
// own session may take a missing session to mean a dead worker.
async function seesOwnSession(db: Database, session: JobSession): Promise<boolean> {
  const name = `${SESSION_PREFIX}${session.id}`;
  const { rows } = await db.withActor(SYSTEM, (trx) =>
    sql<{ seen: boolean }>`
      select exists (select 1 from pg_stat_activity a where a.application_name = ${name}) as seen
    `.execute(trx),
  );
  return rows[0]?.seen === true;
}

async function awaitOwnSession(db: Database, session: JobSession): Promise<boolean> {
  for (let waited = 0; waited < OWN_SESSION_WAIT_MS; waited += OWN_SESSION_POLL_MS) {
    if (await seesOwnSession(db, session)) return true;
    await sleep(OWN_SESSION_POLL_MS);
  }
  return false;
}

// After a connection loss every worker needs time to reconnect and beat again, and that loss
// doesn't move pg_postmaster_start_time, so this process has to see itself for the whole window.
async function trustsItsView(
  db: Database,
  session: JobSession,
  windowSeconds: number,
): Promise<boolean> {
  if (!(await seesOwnSession(db, session))) {
    session.visibleSince = null;
    return false;
  }
  const now = Temporal.Now.instant().epochMilliseconds;
  session.visibleSince ??= now;
  return now - session.visibleSince >= windowSeconds * 1000;
}

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

// A restarted container keeps its worker id, so its row still names the previous process. The new
// process already wrote the heartbeat, so only the connection is left to go by, and
// KRONAUT_WORKER_ID must be unique per process.
// Resolves false when this worker can't see its own session, so it can never release a lock.
export async function registerJobWorkers(
  db: Database,
  workerId: string,
  session: JobSession,
): Promise<boolean> {
  const trusted = await awaitOwnSession(db, session);
  await db.withActor(SYSTEM, async (trx) => {
    if (trusted) {
      const { rows } = await sql<Pools>`
        select h.job_pool_id from worker_heartbeats h
         where h.worker_id = ${workerId} and not ${sessionConnected}
           for update of h
      `.execute(trx);
      await forceUnlock(trx, poolIdsOf(rows));
    }
    await trx
      .updateTable('worker_heartbeats')
      .set({ job_session: session.id, job_pool_id: session.poolId })
      .where('worker_id', '=', workerId)
      .execute();
  });
  return trusted;
}

// A dead worker has both a stale heartbeat and no connection. A stalled or partitioned one keeps
// its connection.
export async function releaseDeadJobWorkers(
  db: Database,
  session: JobSession,
  staleAfterSeconds = STALE_AFTER_SECONDS,
): Promise<string[]> {
  if (!(await trustsItsView(db, session, staleAfterSeconds))) return [];
  return await db.withActor(SYSTEM, async (trx) => {
    const { rows } = await sql<Pools & { worker_id: string }>`
      select h.worker_id, h.job_pool_id from worker_heartbeats h
       where h.job_session is not null
         and h.seen_at < now() - make_interval(secs => ${staleAfterSeconds})
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

function startLockSweep(db: Database, session: JobSession, logger: Logger): LockSweep {
  const sweep = (): Promise<void> =>
    releaseDeadJobWorkers(db, session)
      .then((released) => {
        if (released.length > 0) logger.warn({ released }, 'released locks of dead job workers');
      })
      .catch((err: unknown) => {
        session.visibleSince = null;
        logger.warn({ err }, 'job lock sweep failed');
      })
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

export async function startJobLocks(
  db: Database,
  workerId: string,
  session: JobSession,
  logger: Logger,
): Promise<LockSweep> {
  if (!(await registerJobWorkers(db, workerId, session))) {
    logger.warn('job connections are not visible; dead workers keep their locks for 4 h');
  }
  return startLockSweep(db, session, logger);
}
