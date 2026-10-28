import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { Temporal } from 'temporal-polyfill';
import { envValue, requireEnv } from '../config.ts';
import { type ExportDeps, exportArchive } from './backup/export.ts';
import { importArchive } from './backup/import.ts';
import { spawnPgTools } from './backup/pg-tools.ts';
import { listBackupNames, removeStaleWorkDirs, runBackup, writeStatus } from './backup/run.ts';
import { parseDailyTime, runSchedule } from './backup/schedule.ts';
import { keyring, messages, stderrLogger } from './context.ts';
import { UsageError } from './errors.ts';

function mediaDir(): string {
  return join(resolve(envValue(process.env, 'KRONAUT_DATA_DIR') ?? './data'), 'media');
}

function exportDeps(recipient: string): ExportDeps {
  return {
    migrationUrl: requireEnv(process.env, 'KRONAUT_MIGRATION_DATABASE_URL'),
    recipient,
    mediaDir: mediaDir(),
    pg: spawnPgTools(),
    now: Temporal.Now.instant(),
    logger: stderrLogger,
  };
}

export async function exportCommand(args: readonly string[]): Promise<void> {
  const { values } = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: false,
    options: { out: { type: 'string' } },
  });
  if (values.out === undefined) throw new UsageError((m) => m.option_required({ option: '--out' }));
  const result = await exportArchive(
    exportDeps(requireEnv(process.env, 'KRONAUT_BACKUP_RECIPIENT')),
    values.out,
  );
  process.stdout.write(`${result.path}\n`);
}

export async function importCommand(args: readonly string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: true,
    options: { identity: { type: 'string' } },
  });
  const [file, ...extra] = positionals;
  if (file === undefined || extra.length > 0)
    throw new UsageError((m) => m.expected_one_archive({}));
  if (values.identity === undefined)
    throw new UsageError((m) => m.option_required({ option: '--identity' }));
  const { epoch } = await importArchive(
    {
      migrationUrl: requireEnv(process.env, 'KRONAUT_MIGRATION_DATABASE_URL'),
      mediaDir: mediaDir(),
      keyring: keyring(),
      pg: spawnPgTools(),
      logger: stderrLogger,
    },
    file,
    values.identity,
  );
  process.stdout.write(`${messages.import_done({ epoch })}\n${messages.import_next({})}\n`);
}

async function sleep(ms: number, signal: AbortSignal): Promise<void> {
  try {
    await delay(ms, undefined, { signal });
  } catch (err) {
    if (!signal.aborted) throw err;
  }
}

async function scheduleCommand(dir: string): Promise<void> {
  const daily = parseDailyTime(
    envValue(process.env, 'KRONAUT_BACKUP_TIME'),
    envValue(process.env, 'KRONAUT_BACKUP_TIMEZONE'),
  );
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  try {
    await runSchedule(
      {
        daily,
        now: () => Temporal.Now.instant(),
        sleep,
        listNames: () => listBackupNames(dir),
        cleanup: () => removeStaleWorkDirs(resolve(dir), Temporal.Now.instant(), stderrLogger),
        recipient: () => envValue(process.env, 'KRONAUT_BACKUP_RECIPIENT'),
        runBackup: (recipient) => runBackup(exportDeps(recipient), dir),
        writeStatus: (status) => writeStatus(dir, status),
        logger: stderrLogger,
      },
      controller.signal,
    );
  } finally {
    process.off('SIGTERM', stop);
    process.off('SIGINT', stop);
  }
}

export async function backupCommand(args: readonly string[]): Promise<void> {
  const [mode, ...rest] = args;
  if (mode !== 'run' && mode !== 'schedule') {
    throw new UsageError((m) => m.backup_mode({}));
  }
  const { values } = parseArgs({
    args: rest,
    strict: true,
    allowPositionals: false,
    options: { dir: { type: 'string' } },
  });
  if (values.dir === undefined) throw new UsageError((m) => m.option_required({ option: '--dir' }));
  if (mode === 'run') {
    const path = await runBackup(
      exportDeps(requireEnv(process.env, 'KRONAUT_BACKUP_RECIPIENT')),
      values.dir,
    );
    process.stdout.write(`${path}\n`);
  } else {
    await scheduleCommand(values.dir);
  }
}
