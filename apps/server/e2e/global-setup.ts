import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createDatabase } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { pino } from 'pino';
import type { ServerConfig } from '../src/config.ts';
import { installJobQueue } from '../src/jobs/job-queue.ts';
import { type StartedServer, startServer } from '../src/start.ts';
import { seed } from './seed.ts';

const WEB_DIR = resolve(import.meta.dirname, '../../web/dist/web');

function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const probe = createServer();
    probe.once('error', fail);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() => {
        if (address === null || typeof address === 'string') fail(new Error('no free port'));
        else done(address.port);
      });
    });
  });
}

async function installQueue(test: TestDatabase): Promise<void> {
  const owner = createDatabase({ connectionString: test.ownerUrl });
  try {
    await installJobQueue(test.ownerUrl, owner);
  } finally {
    await owner.destroy();
  }
}

function config(
  test: TestDatabase,
  port: number,
  mediaPort: number,
  dataDir: string,
): ServerConfig {
  return {
    role: 'api',
    port,
    databaseUrl: test.appUrl,
    publicUrl: new URL(`http://localhost:${port}/`),
    mediaUrl: new URL(`http://127.0.0.1:${mediaPort}/`),
    dataDir,
    instanceId: randomUUID(),
    secret: randomBytes(32),
    access: null,
    logLevel: 'silent',
    workerId: 'e2e-api',
    webDir: WEB_DIR,
    smtp: null,
    instanceAdmins: [],
  };
}

async function boot(test: TestDatabase, dataDir: string): Promise<StartedServer> {
  const logger = pino({ level: process.env.E2E_LOG === undefined ? 'silent' : 'info' });
  const env = { KRONAUT_KEK_1: randomBytes(32).toString('base64') };
  const settings = config(test, await freePort(), await freePort(), dataDir);
  await installQueue(test);
  const link = await seed({
    test,
    secret: settings.secret,
    publicUrl: settings.publicUrl,
    env,
    logger,
  });
  const server = await startServer(settings, {
    logger,
    env,
    onFailure: (err) => logger.error({ err }, 'server failed'),
  });
  process.env.E2E_BASE_URL = settings.publicUrl.origin;
  process.env.E2E_SETUP_LINK = link;
  return server;
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  if (!existsSync(join(WEB_DIR, 'index.html'))) {
    throw new Error(`${WEB_DIR}/index.html is missing; run pnpm --filter @kronaut/web build first`);
  }
  const test = await startTestDatabase();
  const dataDir = await mkdtemp(join(tmpdir(), 'kronaut-e2e-'));
  let server: StartedServer;
  try {
    server = await boot(test, dataDir);
  } catch (err) {
    await test.stop();
    await rm(dataDir, { recursive: true, force: true });
    throw err;
  }
  return async () => {
    try {
      await server.stop();
    } finally {
      await test.stop();
      await rm(dataDir, { recursive: true, force: true });
    }
  };
}
