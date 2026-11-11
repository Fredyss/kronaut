import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { keyringFromEnv } from '@kronaut/credentials';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { createHttpClient } from '@kronaut/egress';
import type { Mailer } from '@kronaut/egress/smtp';
import { createLocalStore, deriveMediaSigningKey } from '@kronaut/media';
import { manifests } from '@kronaut/providers/manifests';
import { runtimes } from '@kronaut/providers/runtime';
import { type Runner, run } from 'graphile-worker';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { revokeTask } from './access/channels/revoke.ts';
import { createMediaAccess, createMediaSigner } from './actors/media/access.ts';
import { MEDIA_IMPORT_EGRESS, mediaImportTask } from './actors/media/import/import.ts';
import { createMediaServer } from './actors/media/server.ts';
import { stagingIn } from './actors/media/staging.ts';
import { mediaProcessTask } from './actors/media/video/process.ts';
import { metaLifecycleTask } from './actors/meta/lifecycle.ts';
import { API_BODY_LIMITS, API_SIGN_IN, apiRoutes } from './api-routes.ts';
import type { Env, ServerConfig, ServerRole } from './base/config/config.ts';
import { ConfigError } from './base/config/config.ts';
import { type AccessVerifier, bootAccess } from './base/http/caller/access.ts';
import { drain, listen } from './base/http/listen.ts';
import { createHttpApp, deriveHttpKeys, type HttpDeps } from './base/http/pipeline/kernel.ts';
import { loadWebApp } from './base/http/web.ts';
import { createProviderRegistry } from './base/providers/providers.ts';
import { cronItems, cronTaskList, cronTasks } from './cron.ts';
import { type Heartbeat, startHeartbeat, workerAlive } from './infrastructure/jobs/heartbeat.ts';
import { type LockSweep, openJobSession, startJobLocks } from './infrastructure/jobs/job-locks.ts';
import { jobLogger } from './infrastructure/jobs/job-queue.ts';
import { JOBS } from './infrastructure/jobs/jobs.ts';
import { emailDeps } from './records/notifications/email.ts';
import { SHORTENER_EGRESS } from './records/short-links/api.ts';
import { shortLinksTask } from './steps/publish/shorten/ensure.ts';
import { publishDeps, publishTask } from './steps/publish/task.ts';
import { verifyTask } from './steps/publish/verify/verify.ts';

const APP_VERSION = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

const SYSTEM: Actor = { kind: 'system' };
const WORKER_CONCURRENCY = 4;

export interface StartOptions {
  readonly logger: Logger;
  readonly env?: Env;
  onFailure(err: unknown): void;
}

export interface StartedServer {
  readonly port: number | null;
  stop(): Promise<void>;
}

type Clock = () => Temporal.Instant;

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

function masterSecret(config: ServerConfig): Uint8Array {
  if (config.secret === null) throw new Error('this role runs without KRONAUT_SECRET');
  return config.secret;
}

// Without KRONAUT_MEDIA_KEY the key is derived, as before the media role had a key of its own.
function mediaKeyOf(config: ServerConfig): Uint8Array {
  return config.mediaKey ?? deriveMediaSigningKey(masterSecret(config));
}

async function startMedia(config: ServerConfig, clock: Clock): Promise<StartedServer> {
  const media = createMediaServer({
    store: createLocalStore(join(config.dataDir, 'media')),
    signingKey: mediaKeyOf(config),
    clock,
  });
  const http = await listen(media.fetch, config.port);
  return started(http, () => drain(http));
}

interface Running {
  heartbeat: Heartbeat | null;
  lockSweep: LockSweep | null;
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
    const { heartbeat, http, lockSweep, runner } = state;
    const steps = await Promise.allSettled([
      lockSweep?.stop(),
      http === null ? undefined : drain(http),
      runner === null ? undefined : stopRunner(state, runner),
    ]);
    // a draining worker still holds its locks, so its heartbeat has to outlive the runner
    const expired = await Promise.allSettled([heartbeat?.stop()]);
    const failed = [...steps, ...expired].find(
      (step): step is PromiseRejectedResult => step.status === 'rejected',
    );
    if (failed !== undefined) throw failed.reason;
  } finally {
    state.mailer?.close();
    await db.destroy();
  }
}

async function startWorker(boot: Boot): Promise<void> {
  const { config, options, db, clock, providers, keyring, state } = boot;
  const { logger } = options;
  const store = createLocalStore(join(config.dataDir, 'media'));
  const staging = stagingIn(config.dataDir);
  const publishing = publishDeps({
    db,
    providers,
    keyring,
    media: createMediaAccess({
      db,
      store,
      signingKey: mediaKeyOf(config),
      mediaBaseUrl: config.mediaUrl,
      clock,
    }),
    logger,
    workerId: config.workerId,
    publicBaseUrl: config.publicUrl.origin,
    now: clock,
    shortLinks: { http: createHttpClient(SHORTENER_EGRESS) },
  });
  const publish = publishTask(publishing);
  const verify = verifyTask(publishing);
  const email = emailDeps(config, db, logger);
  state.mailer = email?.mailer ?? null;
  const importHttp = createHttpClient(MEDIA_IMPORT_EGRESS);

  const session = openJobSession(boot.databaseUrl);
  const jobs = await run({
    connectionString: session.connectionString,
    events: session.events,
    concurrency: WORKER_CONCURRENCY,
    logger: jobLogger(logger),
    noHandleSignals: true,
    taskList: {
      ...cronTaskList(db, logger, { ...publishing, staging, store }, email),
      [JOBS.publish]: publish,
      [JOBS.verify]: verify,
      [JOBS.revokeCredential]: revokeTask(publishing),
      [JOBS.mediaProcess]: mediaProcessTask({ db, store, staging, logger }),
      [JOBS.mediaImport]: mediaImportTask({ db, store, staging, http: importHttp, logger }),
      [JOBS.metaLifecycle]: metaLifecycleTask({ db, logger }),
      [JOBS.shortLinks]: shortLinksTask(publishing),
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
  state.lockSweep = await startJobLocks(db, config.workerId, session, logger);
}

async function startApi(boot: Boot): Promise<void> {
  const { config, db, clock, providers, keyring, state } = boot;
  const { logger } = boot.options;
  if (config.access !== null) state.access = await bootAccess(config.access, logger, clock);
  const access = state.access;
  const deps: HttpDeps = {
    db,
    keys: deriveHttpKeys(masterSecret(config)),
    logger,
    clock,
    publicBaseUrl: config.publicUrl.origin,
    instanceAdmins: config.instanceAdmins,
    readiness: async () => !state.stopping && (await workerAlive(db)),
    ...API_SIGN_IN,
    routeBodyLimits: API_BODY_LIMITS,
    ...(access === null ? {} : { access }),
    ...(config.webDir === null ? {} : { web: loadWebApp(config.webDir, config.mediaUrl) }),
  };
  const store = createLocalStore(join(config.dataDir, 'media'));
  const staging = stagingIn(config.dataDir);
  const signer = createMediaSigner({
    signingKey: mediaKeyOf(config),
    mediaBaseUrl: config.mediaUrl,
    clock,
  });
  const routes = apiRoutes({
    http: deps,
    store,
    signer,
    staging,
    keyring,
    providers,
    cronTasks: cronTasks(config.smtp !== null),
  });
  const api = createHttpApp(deps, routes);
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
    lockSweep: null,
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
    const boot: Boot = { config, databaseUrl, options, db, clock, providers, keyring, state };

    if (serves('worker')) await startWorker(boot);
    if (serves('api')) await startApi(boot);
  } catch (err) {
    await stop().catch((cleanup: unknown) => logger.error({ err: cleanup }, 'cleanup failed'));
    throw err;
  }

  return started(state.http, stop);
}
