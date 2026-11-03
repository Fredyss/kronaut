import { mkdir, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { removeStaleWorkDirs } from './run.ts';

const NOW = Temporal.Instant.from('2026-10-26T04:00:00Z');
const logger = pino({ level: 'silent' });

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'kronaut-run-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function ago(minutes: number): Date {
  return new Date(NOW.subtract({ minutes }).epochMilliseconds);
}

async function entry(
  name: string,
  ageMinutes: number,
  kind: 'dir' | 'file',
  dumpAgeMinutes = ageMinutes,
): Promise<void> {
  const path = join(dir, name);
  if (kind === 'dir') {
    await mkdir(path);
    const dump = join(path, 'db.dump');
    await writeFile(dump, 'plaintext');
    await utimes(dump, ago(dumpAgeMinutes), ago(dumpAgeMinutes));
  } else {
    await writeFile(path, 'x');
  }
  await utimes(path, ago(ageMinutes), ago(ageMinutes));
}

describe('removeStaleWorkDirs', () => {
  it('removes only export work dirs older than an hour', async () => {
    await entry('.kronaut-export-old', 61, 'dir');
    await entry('.kronaut-export-fresh', 5, 'dir');
    await entry('.kronaut-export-file', 120, 'file');
    await entry('other-dir', 120, 'dir');
    await entry('kronaut-20261025T033000Z.age', 120, 'file');
    await removeStaleWorkDirs(dir, NOW, logger);
    expect((await readdir(dir)).sort()).toEqual([
      '.kronaut-export-file',
      '.kronaut-export-fresh',
      'kronaut-20261025T033000Z.age',
      'other-dir',
    ]);
  });

  it('keeps a work dir whose dump is still being written', async () => {
    await entry('.kronaut-export-dumping', 90, 'dir', 2);
    await removeStaleWorkDirs(dir, NOW, logger);
    expect(await readdir(dir)).toEqual(['.kronaut-export-dumping']);
  });

  it('removes nothing while another export is writing its archive', async () => {
    await entry('.kronaut-export-archiving', 90, 'dir');
    await entry('kronaut-20261026T023000Z.age.partial', 1, 'file');
    await removeStaleWorkDirs(dir, NOW, logger);
    expect((await readdir(dir)).sort()).toEqual([
      '.kronaut-export-archiving',
      'kronaut-20261026T023000Z.age.partial',
    ]);
  });

  it('logs instead of throwing when the dir cannot be read', async () => {
    await expect(removeStaleWorkDirs(join(dir, 'missing'), NOW, logger)).resolves.toBeUndefined();
  });
});
