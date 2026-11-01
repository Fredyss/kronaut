import { createDatabase, migrate } from '@kronaut/db';
import { parseUuid, requireEnv } from '../config.ts';
import { installJobQueue, jobLogger } from '../jobs/job-queue.ts';
import { logger, noArgs, stderrLogger, withDatabase } from './context.ts';
import { release, restoreComplete } from './instance.ts';

export async function migrateCommand(args: readonly string[]): Promise<void> {
  noArgs(args);
  const connectionString = requireEnv(process.env, 'KRONAUT_MIGRATION_DATABASE_URL');
  const { applied } = await migrate({ connectionString, log: (message) => logger.info(message) });
  const owner = createDatabase({ connectionString, applicationName: 'kronaut-migrate' });
  try {
    await installJobQueue(connectionString, owner, jobLogger(logger));
  } finally {
    await owner.destroy();
  }
  logger.info({ applied }, 'migrate complete');
}

export async function restoreCompleteCommand(args: readonly string[]): Promise<void> {
  noArgs(args);
  const epoch = await withDatabase('KRONAUT_OPERATOR_DATABASE_URL', (db) =>
    restoreComplete({ db, logger: stderrLogger }),
  );
  process.stdout.write(`${epoch}\n`);
}

export async function releaseCommand(args: readonly string[]): Promise<void> {
  noArgs(args);
  const instanceId = parseUuid(
    'KRONAUT_INSTANCE_ID',
    requireEnv(process.env, 'KRONAUT_INSTANCE_ID'),
  );
  await withDatabase('KRONAUT_OPERATOR_DATABASE_URL', (db) =>
    release({ db, logger: stderrLogger }, instanceId),
  );
}
