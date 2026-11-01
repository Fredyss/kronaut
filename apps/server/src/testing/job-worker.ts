import { createDatabase } from '@kronaut/db';
import { run } from 'graphile-worker';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { startHeartbeat } from '../jobs/heartbeat.ts';
import { openJobSession, registerJobWorkers } from '../jobs/job-locks.ts';
import { SILENT_JOB_LOGGER } from '../jobs/job-queue.ts';

const url = process.env.JOB_WORKER_DATABASE_URL ?? '';
const workerId = process.env.JOB_WORKER_ID ?? '';

const db = createDatabase({ connectionString: url });
const session = openJobSession(url);
await startHeartbeat({
  db,
  logger: pino({ level: 'silent' }),
  workerId,
  role: 'worker',
  appVersion: '0.0.0',
  startedAt: Temporal.Now.instant(),
});
await run({
  connectionString: session.connectionString,
  events: session.events,
  concurrency: 4,
  pollInterval: 50,
  logger: SILENT_JOB_LOGGER,
  noHandleSignals: true,
  taskList: {
    hang: () => {
      process.stdout.write('RUNNING\n');
      return new Promise<void>(() => {});
    },
  },
});
await registerJobWorkers(db, workerId, session);
process.stdout.write('READY\n');
