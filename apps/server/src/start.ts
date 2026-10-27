import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { getRequestListener } from '@hono/node-server';
import { keyringFromEnv } from '@kronaut/credentials';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { createHttpClient, type HttpClient } from '@kronaut/egress';
import type { Mailer } from '@kronaut/egress/smtp';
import { createLocalStore, deriveMediaSigningKey } from '@kronaut/media';
import { manifests } from '@kronaut/providers/manifests';
import { runtimes } from '@kronaut/providers/runtime';
import { type Runner, run } from 'graphile-worker';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { revokeTask } from './channels/revoke.ts';
import {
  type AccessConfig,
  ConfigError,
  type Env,
  type ServerConfig,
  type ServerRole,
} from './config.ts';
import { cronItems, cronTaskList } from './cron.ts';
import { type Heartbeat, startHeartbeat, workerAlive } from './heartbeat.ts';
import { ACCESS_EGRESS, type AccessVerifier, createAccessVerifier } from './http/access.ts';
import { apiRoutes } from './http/api-routes.ts';
import { createHttpApp, deriveHttpKeys, type HttpDeps } from './http/kernel.ts';
import { loadWebApp } from './http/web.ts';
import { jobLogger } from './job-queue.ts';
import { JOBS } from './jobs.ts';
import { createMediaAccess } from './media/access.ts';
import { MEDIA_UPLOAD_BODY_LIMIT, MEDIA_UPLOAD_ROUTE_ID } from './media/routes.ts';
import { createMediaServer } from './media/server.ts';
import { emailDeps } from './notifications/email.ts';
import { createProviderRegistry } from './providers.ts';
import { publishDeps, publishTask } from './publish/task.ts';
import { verifyTask } from './publish/verify.ts';

const APP_VERSION = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

const SYSTEM: Actor = { kind: 'system' };
const DRAIN_MS = 10_000;

export interface StartOptions {
  readonly logger: Logger;
  readonly env?: Env;
  onFailure(err: unknown): void;
}

export interface StartedServer {
  readonly port: number | null;
  stop(): Promise<void>;
}

type Fetch = Hono['fetch'];
type Clock = () => Temporal.Instant;

function listen(fetch: Fetch, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer(getRequestListener(fetch));
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}

// close() keeps serving a keep-alive socket that was mid-request for as long as its client reuses it
function drain(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    const force = setTimeout(() => server.closeAllConnections(), DRAIN_MS);
    force.unref();
    server.close((err) => {
      clearTimeout(force);
      if (err) reject(err);
      else resolve();
    });
    server.closeIdleConnections();
  });
}

function started(http: Server | null, stop: () => Promise<void>): StartedServer {
  let stopping: Promise<void> | null = null;
  return {
    port: http === null ? null : (http.address() as AddressInfo).port,
    stop: () => {
      stopping ??= stop();
      return stopping;
    },
  };
}

async function fence(db: Database, instanceId: string, logger: Logger): Promise<void> {
  const paused = await db.withActor(SYSTEM, async (trx) => {
    const result = await sql<{
      paused: boolean;
    }>`select instance_fence(${instanceId}::uuid) as paused`.execute(trx);
    return result.rows[0]?.paused === true;
  });
  if (paused) logger.warn({ instanceId }, 'publishing is paused');
}

export async function bootAccess(
  access: AccessConfig,
  logger: Logger,
  clock: Clock,
  http: HttpClient = createHttpClient({ ...ACCESS_EGRESS, allowedHosts: [access.teamDomain] }),
): Promise<AccessVerifier> {
  const verifier = createAccessVerifier({ ...access, http, logger, now: clock });
  try {
    await verifier.refresh();
  } catch (err) {
    verifier.stop();
    throw err;
  }
  return verifier;
}

async function startMedia(config: ServerConfig, clock: Clock): Promise<StartedServer> {
  const media = createMediaServer({
    store: createLocalStore(join(config.dataDir, 'media')),
    signingKey: deriveMediaSigningKey(config.secret),
    clock,
  });
  const http = await listen(media.fetch, config.port);
  return started(http, () => drain(http));
}

interface Running {
  heartbeat: Heartbeat | null;
  runner: Runner | null;
  runnerStopped: boolean;
  poolDraining: boolean;
  stopping: boolean;
  http: Server | null;
  access: AccessVerifier | null;
  mailer: Mailer | null;
}

interface Boot {
  readonly config: ServerConfig;
  readonly databaseUrl: string;
  readonly options: StartOptions;
  readonly db: Database;
  readonly clock: Clock;
  readonly providers: ReturnType<typeof createProviderRegistry>;
  readonly keyring: ReturnType<typeof keyringFromEnv>;
  readonly state: Running;
}

async function stopRunner(state: Running, jobs: Runner): Promise<void> {
  try {
    // on a pool that is already draining, stop() ends the queue's pg pool under its in-flight jobs
    if (!state.runnerStopped && !state.poolDraining) await jobs.stop();
  } finally {
    await jobs.promise;
  }
}

async function stopAll(db: Database, state: Running): Promise<void> {
  state.stopping = true;
  state.access?.stop();
  try {
    const { heartbeat, http, runner } = state;
    const steps = await Promise.allSettled([
      heartbeat?.stop(),
      http === null ? undefined : drain(http),
      runner === null ? undefined : stopRunner(state, runner),
    ]);
    const failed = steps.find((step): step is PromiseRejectedResult => step.status === 'rejected');
    if (failed !== undefined) throw failed.reason;
  } finally {
    state.mailer?.close();
    await db.destroy();
  }
}

async function startWorker(boot: Boot): Promise<void> {
  const { config, options, db, clock, providers, keyring, state } = boot;
  const { logger } = options;
  const publishing = publishDeps({
    db,
    providers,
    keyring,
    media: createMediaAccess({
      db,
      store: createLocalStore(join(config.dataDir, 'media')),
      signingKey: deriveMediaSigningKey(config.secret),
      mediaBaseUrl: config.mediaUrl,
      clock,
    }),
    logger,
    workerId: config.workerId,
    publicBaseUrl: config.publicUrl.origin,
    now: clock,
  });
  const publish = publishTask(publishing);
  const verify = verifyTask(publishing);
  const email = emailDeps(config, db, logger);
  state.mailer = email?.mailer ?? null;

  const jobs = await run({
    connectionString: boot.databaseUrl,
    logger: jobLogger(logger),
    noHandleSignals: true,
    taskList: {
      ...cronTaskList(db, logger, publishing, email),
      [JOBS.publish]: publish,
      [JOBS.verify]: verify,
      [JOBS.revokeCredential]: revokeTask(publishing),
    },
    parsedCronItems: cronItems(email !== null),
  });
  state.runner = jobs;
  jobs.events.on('stop', () => {
    state.runnerStopped = true;
  });
  jobs.events.on('pool:gracefulShutdown', () => {
    state.poolDraining = true;
  });
  const stoppedOnItsOwn = (err: unknown): void => {
    if (state.stopping) return;
    state.heartbeat
      ?.stop()
      .catch((expired: unknown) => logger.warn({ err: expired }, 'heartbeat expiry failed'));
    options.onFailure(err);
  };
  jobs.promise.then(
    () => stoppedOnItsOwn(new Error('job runner stopped')),
    (err: unknown) => stoppedOnItsOwn(err),
  );
}

async function startApi(boot: Boot): Promise<void> {
  const { config, db, clock, providers, keyring, state } = boot;
  const { logger } = boot.options;
  if (config.access !== null) state.access = await bootAccess(config.access, logger, clock);
  const access = state.access;
  const deps: HttpDeps = {
    db,
    keys: deriveHttpKeys(config.secret),
    logger,
    clock,
    publicBaseUrl: config.publicUrl.origin,
    readiness: async () => !state.stopping && (await workerAlive(db)),
    routeBodyLimits: { [MEDIA_UPLOAD_ROUTE_ID]: MEDIA_UPLOAD_BODY_LIMIT },
    ...(access === null ? {} : { access }),
    ...(config.webDir === null ? {} : { web: loadWebApp(config.webDir, config.mediaUrl) }),
  };
  const store = createLocalStore(join(config.dataDir, 'media'));
  const api = createHttpApp(deps, apiRoutes({ http: deps, store, keyring, providers }));
  state.http = await listen(api.fetch, config.port);
}

export async function startServer(
  config: ServerConfig,
  options: StartOptions,
): Promise<StartedServer> {
  const { logger } = options;
  const clock: Clock = () => Temporal.Now.instant();
  if (config.role === 'media') return startMedia(config, clock);
  const { databaseUrl } = config;
  if (databaseUrl === null) throw new ConfigError('KRONAUT_DATABASE_URL', 'is required');

  const serves = (role: ServerRole): boolean => config.role === 'all' || config.role === role;
  const db = createDatabase({
    connectionString: databaseUrl,
    applicationName: `kronaut-${config.role}`,
    onPoolError: (err) => logger.error({ err }, 'database pool error'),
  });
  const state: Running = {
    heartbeat: null,
    runner: null,
    runnerStopped: false,
    poolDraining: false,
    stopping: false,
    http: null,
    access: null,
    mailer: null,
  };
  const stop = (): Promise<void> => stopAll(db, state);

  try {
    await fence(db, config.instanceId, logger);
    state.heartbeat = await startHeartbeat({
      db,
      logger,
      workerId: config.workerId,
      role: config.role,
      appVersion: APP_VERSION,
      startedAt: clock(),
    });

    const providers = createProviderRegistry(manifests, runtimes);
    const keyring = keyringFromEnv(options.env ?? process.env);
    const boot: Boot = {
      config,
      databaseUrl,
      options,
      db,
      clock,
      providers,
      keyring,
      state,
    };

    if (serves('worker')) await startWorker(boot);
    if (serves('api')) await startApi(boot);
  } catch (err) {
    await stop().catch((cleanup: unknown) => logger.error({ err: cleanup }, 'cleanup failed'));
    throw err;
  }

  return started(state.http, stop);
}
