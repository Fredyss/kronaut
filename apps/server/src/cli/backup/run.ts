import { readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import { type ExportDeps, exportArchive } from './export.ts';
import { archiveName, planRotation } from './rotation.ts';
import { type BackupStatus, describeError } from './schedule.ts';

export const STATUS_FILE = 'last-backup.json';

const WORK_DIR = /^\.kronaut-export-/;
const WORK_DIR_MAX_AGE_MS = 60 * 60 * 1000;
const PARTIAL_SUFFIX = '.partial';

type Fresh = (mtimeMs: number) => boolean;

export async function listBackupNames(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

async function lastChangeMs(path: string): Promise<number> {
  const names = await readdir(path);
  const paths = [path, ...names.map((name) => join(path, name))];
  const times = await Promise.all(paths.map(async (entry) => (await stat(entry)).mtimeMs));
  return Math.max(...times);
}

async function exportWriting(
  dir: string,
  names: readonly string[],
  isFresh: Fresh,
): Promise<boolean> {
  for (const name of names) {
    if (name.endsWith(PARTIAL_SUFFIX) && isFresh((await stat(join(dir, name))).mtimeMs))
      return true;
  }
  return false;
}

async function removeIfStale(path: string, isFresh: Fresh, logger: Logger): Promise<void> {
  try {
    if (isFresh(await lastChangeMs(path))) return;
    await rm(path, { recursive: true, force: true });
    logger.warn({ dir: basename(path) }, 'removed the work dir of an interrupted backup');
  } catch (err) {
    logger.error({ dir: basename(path), error: describeError(err) }, 'cannot remove a work dir');
  }
}

// an export killed before its cleanup leaves a plaintext pg_dump in its work dir
export async function removeStaleWorkDirs(
  dir: string,
  now: Temporal.Instant,
  logger: Logger,
): Promise<void> {
  const isFresh: Fresh = (mtimeMs) => now.epochMilliseconds - mtimeMs < WORK_DIR_MAX_AGE_MS;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    if (await exportWriting(dir, files, isFresh)) return;
    for (const entry of entries) {
      if (entry.isDirectory() && WORK_DIR.test(entry.name)) {
        await removeIfStale(join(dir, entry.name), isFresh, logger);
      }
    }
  } catch (err) {
    logger.error({ error: describeError(err) }, 'cannot clean up interrupted backups');
  }
}

async function rotate(deps: ExportDeps, dir: string): Promise<void> {
  const { remove } = planRotation(await listBackupNames(dir), deps.now);
  for (const name of remove) await rm(join(dir, name), { force: true });
  if (remove.length > 0) deps.logger.info({ removed: remove }, 'old backups removed');
}

export async function runBackup(deps: ExportDeps, dir: string): Promise<string> {
  const target = resolve(dir);
  await removeStaleWorkDirs(target, deps.now, deps.logger);
  const { path } = await exportArchive(deps, join(target, archiveName(deps.now)));
  try {
    await rotate(deps, target);
  } catch (err) {
    deps.logger.error({ error: describeError(err) }, 'backup rotation failed');
  }
  return path;
}

export async function writeStatus(dir: string, status: BackupStatus): Promise<void> {
  const target = join(resolve(dir), STATUS_FILE);
  const temp = `${target}.tmp`;
  await writeFile(temp, `${JSON.stringify(status)}\n`, { mode: 0o644 });
  await rename(temp, target);
}
