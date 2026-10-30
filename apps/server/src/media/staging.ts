import { randomBytes } from 'node:crypto';
import { mkdir, open, readdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Temporal } from 'temporal-polyfill';

export interface Staging {
  receive(bytes: Uint8Array): Promise<string>;
  place(tempPath: string, key: string, part: number): Promise<void>;
  parts(key: string): Promise<ReadonlyMap<number, number>>;
  directory(key: string): string;
  discard(tempPath: string): Promise<void>;
  remove(key: string): Promise<void>;
  sweepIncoming(olderThanMs: number): Promise<number>;
}

const FILE_MODE = 0o640;
const DIR_MODE = 0o750;
const INCOMING = '.incoming';
const STAGING_KEY = /^[0-9a-f]{64}$/;
const PART_FILE = /^([1-9][0-9]*)\.part$/;

function isErrno(error: unknown, code: string): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === code;
}

async function sweepOlderThan(dir: string, olderThanMs: number): Promise<number> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (error) {
    if (isErrno(error, 'ENOENT')) return 0;
    throw error;
  }
  const cutoff = Temporal.Now.instant().epochMilliseconds - olderThanMs;
  let removed = 0;
  for (const entry of entries) {
    const path = join(dir, entry);
    const stats = await stat(path).catch(() => null);
    if (stats === null || !stats.isFile() || stats.mtimeMs >= cutoff) continue;
    await rm(path, { force: true });
    removed++;
  }
  return removed;
}

export function stagingIn(dataDir: string): Staging {
  return createStaging(join(dataDir, 'media', '.staging'));
}

export function createStaging(root: string): Staging {
  const incoming = join(root, INCOMING);

  const directory = (key: string): string => {
    if (!STAGING_KEY.test(key)) throw new TypeError('invalid staging key');
    return join(root, key);
  };

  const assertIncoming = (tempPath: string): void => {
    if (dirname(tempPath) !== incoming) throw new TypeError('not a staging temp file');
  };

  return {
    directory,
    async receive(bytes) {
      await mkdir(incoming, { recursive: true, mode: DIR_MODE });
      const path = join(incoming, randomBytes(16).toString('hex'));
      const handle = await open(path, 'wx', FILE_MODE);
      try {
        await handle.writeFile(bytes);
        await handle.sync();
      } catch (error) {
        await handle.close();
        await rm(path, { force: true });
        throw error;
      }
      await handle.close();
      return path;
    },
    async place(tempPath, key, part) {
      assertIncoming(tempPath);
      if (!Number.isSafeInteger(part) || part < 1) throw new TypeError('invalid part number');
      const dir = directory(key);
      await mkdir(dir, { recursive: true, mode: DIR_MODE });
      await rename(tempPath, join(dir, `${part}.part`));
    },
    async parts(key) {
      const dir = directory(key);
      let entries: string[];
      try {
        entries = await readdir(dir);
      } catch (error) {
        if (isErrno(error, 'ENOENT')) return new Map();
        throw error;
      }
      const sizes = new Map<number, number>();
      for (const entry of entries) {
        const match = PART_FILE.exec(entry);
        if (match?.[1] === undefined) continue;
        sizes.set(Number(match[1]), (await stat(join(dir, entry))).size);
      }
      return sizes;
    },
    async discard(tempPath) {
      assertIncoming(tempPath);
      await rm(tempPath, { force: true });
    },
    async remove(key) {
      await rm(directory(key), { recursive: true, force: true });
    },
    sweepIncoming: (olderThanMs) => sweepOlderThan(incoming, olderThanMs),
  };
}
