import { type ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { quickAddJob, run } from 'graphile-worker';
import { sql } from 'kysely';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  type JobSession,
  openJobSession,
  registerJobWorkers,
  releaseDeadJobWorkers,
} from './job-locks.ts';
import { installJobQueue, SILENT_JOB_LOGGER } from './job-queue.ts';

const CLI = { kind: 'cli' } as const;
const WORKER_ENTRY = new URL('./testing/job-worker.ts', import.meta.url).pathname;
const LONG_MS = 30_000;

let test: TestDatabase;
let owner: Database;
let app: Database;
let reader: JobSession;
let readerDb: Database;
let closeReader = (): void => {};
let readerOpen: Promise<void>;

beforeAll(async () => {
  test = await startTestDatabase();
  owner = createDatabase({ connectionString: test.ownerUrl });
  app = createDatabase({ connectionString: test.appUrl });
  await installJobQueue(test.ownerUrl, owner);
  reader = openJobSession(test.appUrl);
  readerDb = createDatabase({ connectionString: reader.connectionString });
  readerOpen = readerDb.withActor(CLI, () => new Promise((resolve) => (closeReader = resolve)));
  await vi.waitFor(async () => expect(await connections(reader.id)).toBe(1));
});

afterAll(async () => {
  closeReader();
  await readerOpen;
  await readerDb?.destroy();
  await app?.destroy();
  await owner?.destroy();
  await test?.stop();
});

afterEach(() =>
  owner.withActor(CLI, (trx) => sql`delete from graphile_worker._private_jobs`.execute(trx)),
);

interface Worker {
  readonly id: string;
  readonly child: ChildProcess;
  saw(line: string): Promise<void>;
}

async function startWorker(id = randomUUID()): Promise<Worker> {
  const child = spawn(process.execPath, [WORKER_ENTRY], {
    env: { ...process.env, JOB_WORKER_DATABASE_URL: test.appUrl, JOB_WORKER_ID: id },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let output = '';
  child.stdout?.on('data', (chunk) => {
    output += String(chunk);
  });
  const saw = (line: string): Promise<void> =>
    vi.waitFor(() => expect(output).toContain(line), { timeout: LONG_MS, interval: 25 });
  await saw('READY');
  return { id, child, saw };
}

async function addJob(
  task: string,
  options: { queueName?: string; maxAttempts?: number; jobKey: string },
): Promise<void> {
  await quickAddJob(
    { connectionString: test.ownerUrl, logger: SILENT_JOB_LOGGER },
    task,
    {},
    options,
  );
}

async function kill(worker: Worker): Promise<void> {
  const exited = new Promise((resolve) => worker.child.once('exit', resolve));
  worker.child.kill('SIGKILL');
  await exited;
  const session = await sessionOf(worker.id);
  await vi.waitFor(async () => expect(await connections(session)).toBe(0), {
    timeout: LONG_MS,
    interval: 25,
  });
}

function heartbeat(workerId: string) {
  return owner.withActor(CLI, (trx) =>
    trx
      .selectFrom('worker_heartbeats')
      .select(['job_session', 'job_pool_id'])
      .where('worker_id', '=', workerId)
      .executeTakeFirstOrThrow(),
  );
}

async function sessionOf(workerId: string): Promise<string> {
  return (await heartbeat(workerId)).job_session ?? '';
}

function connections(session: string): Promise<number> {
  return owner.withActor(CLI, async (trx) => {
    const { rows } = await sql<{ count: number }>`
      select count(*)::int as count from pg_stat_activity
       where application_name = ${`kronaut-jobs-${session}`}
    `.execute(trx);
    return rows[0]?.count ?? 0;
  });
}

function age(workerId: string): Promise<unknown> {
  return owner.withActor(CLI, (trx) =>
    sql`update worker_heartbeats set seen_at = now() - interval '2 hours' where worker_id = ${workerId}`.execute(
      trx,
    ),
  );
}

function lockHolder(jobKey: string): Promise<string | null | undefined> {
  return owner.withActor(CLI, async (trx) => {
    const { rows } = await sql<{ locked_by: string | null }>`
      select locked_by from graphile_worker.jobs where key = ${jobKey}
    `.execute(trx);
    return rows[0]?.locked_by;
  });
}

function sweep(staleAfterSeconds?: number): Promise<string[]> {
  return releaseDeadJobWorkers(app, reader, staleAfterSeconds);
}

async function ranByFreshWorker(expected: string): Promise<string[]> {
  const ran: string[] = [];
  const record = (name: string) => async () => {
    ran.push(name);
  };
  const runner = await run({
    connectionString: test.appUrl,
    concurrency: 4,
    pollInterval: 50,
    logger: SILENT_JOB_LOGGER,
    noHandleSignals: true,
    taskList: { hang: record('hang'), tick: record('tick') },
  });
  try {
    await vi.waitFor(() => expect(ran).toContain(expected), { timeout: 10_000, interval: 25 });
  } finally {
    await runner.stop();
  }
  return ran;
}

describe('dead job workers', () => {
  it.each(['media', 'media-import'])(
    'frees queue %s after a SIGKILL',
    async (queueName) => {
      const worker = await startWorker();
      const held = `${queueName}:held`;
      await addJob('hang', { queueName, maxAttempts: 3, jobKey: held });
      await worker.saw('RUNNING');
      await addJob('tick', { queueName, jobKey: `${queueName}:next` });
      await kill(worker);

      expect(await sweep()).toEqual([]);
      expect(await lockHolder(held)).not.toBeNull();

      await age(worker.id);
      const pool = (await heartbeat(worker.id)).job_pool_id;
      expect(await lockHolder(held)).toBe(pool);
      expect(await sweep(0)).toEqual([pool]);
      expect(await lockHolder(held)).toBeNull();
      expect(await heartbeat(worker.id)).toEqual({ job_session: null, job_pool_id: null });

      expect(await ranByFreshWorker('tick')).toEqual(expect.arrayContaining(['hang', 'tick']));
    },
    60_000,
  );

  it('never releases a live worker with a stale heartbeat', async () => {
    const worker = await startWorker();
    await addJob('hang', { queueName: 'live', jobKey: 'live:held' });
    await worker.saw('RUNNING');
    const holder = await lockHolder('live:held');
    try {
      await age(worker.id);
      expect(await sweep(0)).toEqual([]);
      expect(holder).not.toBeNull();
      expect(await lockHolder('live:held')).toBe(holder);
    } finally {
      await kill(worker);
    }
    await age(worker.id);
    await sweep(0);
  }, 60_000);

  it('gives workers the full window after a Postgres restart', async () => {
    const worker = await startWorker();
    await addJob('hang', { queueName: 'restart', jobKey: 'restart:held' });
    await worker.saw('RUNNING');
    await kill(worker);
    await age(worker.id);
    expect(await sweep(3600)).toEqual([]);
    expect(await lockHolder('restart:held')).not.toBeNull();
    expect(await sweep(0)).toHaveLength(1);
  }, 60_000);

  it('does not run a spent job again', async () => {
    const worker = await startWorker();
    await addJob('hang', { maxAttempts: 1, jobKey: 'spent' });
    await worker.saw('RUNNING');
    await kill(worker);
    await age(worker.id);
    await sweep(0);
    expect(await lockHolder('spent')).toBeNull();

    await addJob('tick', { jobKey: 'after-spent' });
    expect(await ranByFreshWorker('tick')).not.toContain('hang');
  }, 60_000);

  it('releases the previous process when the same worker id restarts', async () => {
    const worker = await startWorker();
    await addJob('hang', { queueName: 'restarted', jobKey: 'restarted:held' });
    await worker.saw('RUNNING');
    await kill(worker);

    expect(await registerJobWorkers(app, worker.id, reader)).toBe(true);

    expect(await lockHolder('restarted:held')).toBeNull();
  }, 60_000);

  it('leaves a connected session alone when another process claims its worker id', async () => {
    const worker = await startWorker();
    await addJob('hang', { queueName: 'shared', jobKey: 'shared:held' });
    await worker.saw('RUNNING');
    const holder = await lockHolder('shared:held');
    try {
      await registerJobWorkers(app, worker.id, reader);
      expect(await lockHolder('shared:held')).toBe(holder);
    } finally {
      worker.child.kill('SIGKILL');
    }
  }, 60_000);

  it('keeps every lock when it cannot see its own session', async () => {
    const worker = await startWorker();
    await addJob('hang', { queueName: 'blind', jobKey: 'blind:held' });
    await worker.saw('RUNNING');
    const holder = await lockHolder('blind:held');
    await kill(worker);
    await age(worker.id);

    const blind = openJobSession(test.appUrl);
    expect(await releaseDeadJobWorkers(app, blind, 0)).toEqual([]);
    expect(await registerJobWorkers(app, worker.id, blind)).toBe(false);

    expect(await lockHolder('blind:held')).toBe(holder);
  }, 60_000);
});
