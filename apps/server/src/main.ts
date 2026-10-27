import { installGlobalDispatcher } from '@kronaut/egress';
import { pino } from 'pino';
import { ConfigError, loadServerConfig, type ServerConfig } from './config.ts';
import { startServer } from './start.ts';

const SHUTDOWN_TIMEOUT_MS = 30_000;
const REDACT = [
  'password',
  'secret',
  'token',
  '*.password',
  '*.secret',
  '*.token',
  'headers.authorization',
  'headers.cookie',
  '*.headers.authorization',
  '*.headers.cookie',
];

let config: ServerConfig;
try {
  config = loadServerConfig(process.env, process.argv.slice(2));
} catch (err) {
  if (!(err instanceof ConfigError)) throw err;
  pino({ base: null }).fatal(err.message);
  process.exit(1);
}

const logger = pino({
  level: config.logLevel,
  base: { role: config.role, worker: config.workerId },
  redact: { paths: REDACT, censor: '[redacted]' },
});

installGlobalDispatcher();

let exiting = false;
const started = startServer(config, {
  logger,
  onFailure: (err) => {
    logger.fatal({ err }, 'job worker failed');
    void shutdown(1);
  },
});

async function shutdown(code: number): Promise<void> {
  if (exiting) return;
  exiting = true;
  const force = setTimeout(() => {
    logger.fatal('shutdown timed out');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  try {
    await (await started).stop();
    process.exitCode = code;
  } catch (err) {
    logger.error({ err }, 'shutdown failed');
    process.exitCode = 1;
  } finally {
    clearTimeout(force);
  }
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    logger.info({ signal }, 'shutting down');
    void shutdown(0);
  });
}

try {
  const server = await started;
  logger.info({ port: server.port }, 'kronaut started');
} catch (err) {
  logger.fatal({ err }, 'startup failed');
  process.exitCode = 1;
}
