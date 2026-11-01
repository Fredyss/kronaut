import type { Actor, Database } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import type { ServerRole } from '../config.ts';

const SYSTEM: Actor = { kind: 'system' };
const HEARTBEAT_INTERVAL_MS = 15_000;
const STALE_AFTER_SECONDS = 60;

export interface HeartbeatOptions {
  readonly db: Database;
  readonly logger: Logger;
  readonly workerId: string;
  readonly role: ServerRole;
  readonly appVersion: string;
  readonly startedAt: Temporal.Instant;
}

export interface Heartbeat {
  stop(): Promise<void>;
}

async function beat(options: HeartbeatOptions): Promise<void> {
  const row = {
    role: options.role,
    started_at: options.startedAt.toString(),
    seen_at: sql<Date>`now()`,
    app_version: options.appVersion,
  };
  await options.db.withActor(SYSTEM, (trx) =>
    trx
      .insertInto('worker_heartbeats')
      .values({ worker_id: options.workerId, ...row })
      .onConflict((oc) => oc.column('worker_id').doUpdateSet(row))
      .execute(),
  );
}

export async function startHeartbeat(options: HeartbeatOptions): Promise<Heartbeat> {
  await beat(options);
  let pending: Promise<void> | null = null;
  let stopping = false;
  const timer = setInterval(() => {
    if (pending !== null || stopping) return;
    pending = beat(options)
      .catch((err: unknown) => options.logger.warn({ err }, 'heartbeat failed'))
      .finally(() => {
        pending = null;
      });
  }, HEARTBEAT_INTERVAL_MS);
  timer.unref();
  const expire = async (): Promise<void> => {
    stopping = true;
    clearInterval(timer);
    await pending;
    await options.db.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('worker_heartbeats')
        .set({ seen_at: sql<Date>`'epoch'`, job_session: null, job_pool_id: null })
        .where('worker_id', '=', options.workerId)
        .execute(),
    );
  };
  let stopped: Promise<void> | null = null;
  return {
    stop: () => {
      stopped ??= expire();
      return stopped;
    },
  };
}

export async function workerAlive(db: Database): Promise<boolean> {
  const row = await db.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('worker_heartbeats')
      .select('worker_id')
      .where('role', 'in', ['all', 'worker'])
      .where('seen_at', '>', sql<Date>`now() - make_interval(secs => ${STALE_AFTER_SECONDS})`)
      .limit(1)
      .executeTakeFirst(),
  );
  return row !== undefined;
}
