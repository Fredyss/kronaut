import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { createLocalStore, deriveMediaSigningKey, signMediaPath, storageKey } from '@kronaut/media';
import { quickAddJob } from 'graphile-worker';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ServerConfig, ServerRole } from './config.ts';
import { CRON_TASKS, recordCronRun } from './cron.ts';
import { startHeartbeat } from './heartbeat.ts';
import { installJobQueue, jobLogger } from './job-queue.ts';
import { pngFixture } from './media/testing.ts';
import { startServer } from './start.ts';

const INSTANCE_ID = randomUUID();
const logger = pino({ level: 'silent' });
const env = { KRONAUT_KEK_1: randomBytes(32).toString('base64') };

let test: TestDatabase;
let owner: Database;
let app: Database;
let dataDir: string;

beforeAll(async () => {
  test = await startTestDatabase();
  owner = createDatabase({ connectionString: test.ownerUrl });
  app = createDatabase({ connectionString: test.appUrl });
  await installJobQueue(test.ownerUrl, owner);
  dataDir = await mkdtemp(join(tmpdir(), 'kronaut-start-'));
});

afterAll(async () => {
  await app?.destroy();
  await owner?.destroy();
  await test?.stop();
  if (dataDir !== undefined) await rm(dataDir, { recursive: true, force: true });
});

function config(role: ServerRole, workerId: string, instanceId = INSTANCE_ID): ServerConfig {
  return {
    role,
    port: 0,
    databaseUrl: role === 'media' ? null : test.appUrl,
    publicUrl: new URL('http://localhost/'),
    mediaUrl: new URL('http://127.0.0.1/'),
    dataDir,
    instanceId,
    secret: randomBytes(32),
    access: null,
    logLevel: 'silent',
    workerId,
    webDir: null,
    smtp: null,
  };
}

function send(port: number | null, path: string, body?: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port: port ?? 0,
        path,
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.once('error', reject);
    req.end(body);
  });
}

function onFailure(err: unknown): void {
  throw err;
}

function heartbeatOf(workerId: string) {
  return owner.withActor({ kind: 'cli' }, (trx) =>
    trx
      .selectFrom('worker_heartbeats')
      .select(['role', 'app_version'])
      .where('worker_id', '=', workerId)
      .executeTakeFirst(),
  );
}

function instanceState() {
  return owner.withActor({ kind: 'cli' }, (trx) =>
    trx
      .selectFrom('instance_state')
      .select(['instance_id', 'publishing_paused', 'paused_reason'])
      .executeTakeFirstOrThrow(),
  );
}

function lastRun(task: string) {
  return owner.withActor({ kind: 'cli' }, (trx) =>
    trx
      .selectFrom('cron_runs')
      .select(['outcome', 'detail', 'finished_at'])
      .where('task', '=', task)
      .orderBy('started_at', 'desc')
      .executeTakeFirstOrThrow(),
  );
}

describe('startServer', () => {
  it('serves the API with a live worker and adopts the instance id', async () => {
    const server = await startServer(config('all', 'start-all'), { logger, onFailure, env });
    try {
      expect(await send(server.port, '/healthz')).toBe(200);
      expect(await send(server.port, '/readyz')).toBe(200);
      expect(await heartbeatOf('start-all')).toEqual({ role: 'all', app_version: '0.0.0' });
      expect(await instanceState()).toEqual({
        instance_id: INSTANCE_ID,
        publishing_paused: false,
        paused_reason: null,
      });
      await quickAddJob(
        { connectionString: test.ownerUrl, logger: jobLogger(logger) },
        CRON_TASKS.auditMaintenance,
        {},
      );
      await vi.waitFor(
        async () => {
          const run = await lastRun(CRON_TASKS.auditMaintenance);
          expect(run.outcome).toBe('ok');
          expect(JSON.parse(run.detail ?? '')).toMatchObject({ audit_events_default: 0 });
        },
        { timeout: 10_000, interval: 100 },
      );
    } finally {
      await Promise.all([server.stop(), server.stop()]);
    }
  });

  it('lets a media upload past the default body limit', async () => {
    const server = await startServer(config('api', 'start-upload'), { logger, onFailure, env });
    try {
      const body = Buffer.alloc(2 * 1024 * 1024, 0x20);
      expect(await send(server.port, `/v1/workspaces/${randomUUID()}/media`, body)).toBe(401);
      expect(await send(server.port, '/v1/auth/login', body)).toBe(413);
    } finally {
      await server.stop();
    }
  });

  it('is not ready without a live worker heartbeat', async () => {
    await owner.withActor({ kind: 'cli' }, (trx) => trx.deleteFrom('worker_heartbeats').execute());
    const server = await startServer(config('api', 'start-api'), { logger, onFailure, env });
    try {
      expect(await send(server.port, '/readyz')).toBe(503);
    } finally {
      await server.stop();
    }
  });

  it('serves signed media without a database', async () => {
    const media = config('media', 'start-media');
    const png = pngFixture();
    const key = storageKey(randomUUID(), createHash('sha256').update(png).digest());
    await createLocalStore(join(dataDir, 'media')).put(key, png);
    const server = await startServer(media, { logger, onFailure });
    try {
      const expiresAt = Math.floor(Temporal.Now.instant().epochMilliseconds / 1000) + 600;
      const path = signMediaPath(deriveMediaSigningKey(media.secret), key, expiresAt);
      expect(await send(server.port, path)).toBe(200);
      expect(await send(server.port, '/healthz')).toBe(404);
      expect(await heartbeatOf('start-media')).toBeUndefined();
    } finally {
      await server.stop();
    }
  });

  it('reports a job runner that stops on its own', async () => {
    const exitCode = process.exitCode;
    const failures: unknown[] = [];
    const server = await startServer(config('worker', 'start-worker'), {
      logger,
      env,
      onFailure: (err) => failures.push(err),
    });
    try {
      expect(server.port).toBeNull();
      await vi.waitFor(
        async () => {
          await owner.withActor({ kind: 'cli' }, (trx) =>
            sql`select pg_notify('worker:migrate', ${JSON.stringify({ migrationNumber: 999, breaking: true })})`.execute(
              trx,
            ),
          );
          expect(failures).toHaveLength(1);
        },
        { timeout: 10_000, interval: 250 },
      );
      expect(String(failures[0])).toContain('job runner stopped');
      await expect(server.stop()).resolves.toBeUndefined();
    } finally {
      await server.stop().catch(() => undefined);
      // graphile-worker sets exitCode 57 when it sees a breaking queue migration
      process.exitCode = exitCode;
    }
  });

  it('pauses publishing on a database that belongs to another instance', async () => {
    await owner.withActor({ kind: 'cli' }, (trx) =>
      sql`select instance_fence(${INSTANCE_ID}::uuid)`.execute(trx),
    );
    const server = await startServer(config('api', 'start-clone', randomUUID()), {
      logger,
      onFailure,
      env,
    });
    await server.stop();
    expect(await instanceState()).toEqual({
      instance_id: INSTANCE_ID,
      publishing_paused: true,
      paused_reason: 'instance_id_mismatch',
    });
  });
});

describe('startHeartbeat', () => {
  function fresh(workerId: string) {
    return owner.withActor({ kind: 'cli' }, async (trx) => {
      const { rows } = await sql<{ fresh: boolean }>`
        select seen_at > now() - interval '60 seconds' as fresh from worker_heartbeats where worker_id = ${workerId}
      `.execute(trx);
      return rows[0]?.fresh;
    });
  }

  it('refreshes an existing row and expires it on stop', async () => {
    const options = {
      db: app,
      logger,
      workerId: 'beat',
      role: 'worker' as const,
      appVersion: '0.0.0',
      startedAt: Temporal.Now.instant(),
    };
    const first = await startHeartbeat(options);
    await owner.withActor({ kind: 'cli' }, (trx) =>
      sql`update worker_heartbeats set seen_at = now() - interval '5 minutes' where worker_id = 'beat'`.execute(
        trx,
      ),
    );
    expect(await fresh('beat')).toBe(false);
    const second = await startHeartbeat(options);
    expect(await fresh('beat')).toBe(true);
    await Promise.all([first.stop(), second.stop()]);
    expect(await fresh('beat')).toBe(false);
  });
});

describe('recordCronRun', () => {
  it('records a failure and rethrows it', async () => {
    await expect(
      recordCronRun(app, 'probe', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const run = await lastRun('probe');
    expect(run.outcome).toBe('error');
    expect(run.detail).toBe('boom');
    expect(run.finished_at).not.toBeNull();
  });
});
