import { createHash, type Hash, randomBytes } from 'node:crypto';
import type { Stats } from 'node:fs';
import { constants } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import { link, lstat, mkdir, open as openFile, rm, unlink } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { isStorageKey } from './storage-key.ts';

export interface ByteRange {
  readonly start: number;
  readonly end: number;
}

export interface MediaStore {
  put(
    key: string,
    data: Uint8Array | AsyncIterable<Uint8Array>,
  ): Promise<{ bytes: number; sha256: Buffer }>;
  open(
    key: string,
    range?: ByteRange,
  ): Promise<{ stream: NodeJS.ReadableStream; size: number } | null>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

const FILE_MODE = 0o640;
const DIR_MODE = 0o750;
const TMP_DIR = '.tmp';
const SHARD_LENGTH = 2;

function assertKey(key: string): void {
  if (!isStorageKey(key)) {
    throw new TypeError('invalid storage key');
  }
}

function assertRange(range: ByteRange | undefined): void {
  if (range === undefined) return;
  const { start, end } = range;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end) {
    throw new TypeError('invalid byte range');
  }
}

function isErrno(error: unknown, code: string): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === code;
}

async function writeAll(handle: FileHandle, chunk: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < chunk.byteLength) {
    const { bytesWritten } = await handle.write(chunk, offset, chunk.byteLength - offset);
    if (bytesWritten === 0) {
      throw new Error('write made no progress');
    }
    offset += bytesWritten;
  }
}

async function* singleChunk(chunk: Uint8Array): AsyncGenerator<Uint8Array> {
  yield chunk;
}

function toChunks(data: Uint8Array | AsyncIterable<Uint8Array>): AsyncIterable<Uint8Array> {
  if (data instanceof Uint8Array) {
    return singleChunk(data);
  }
  if (data !== null && typeof data === 'object' && Symbol.asyncIterator in data) {
    return data;
  }
  throw new TypeError('data must be a Uint8Array or an async iterable of Uint8Array');
}

async function lstatOrNull(path: string): Promise<Stats | null> {
  try {
    return await lstat(path);
  } catch (error) {
    if (isErrno(error, 'ENOENT')) {
      return null;
    }
    throw error;
  }
}

async function writeChunks(
  handle: FileHandle,
  chunks: AsyncIterable<Uint8Array>,
): Promise<{ bytes: number; hash: Hash }> {
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of chunks) {
    if (!(chunk instanceof Uint8Array)) {
      throw new TypeError('chunks must be Uint8Array');
    }
    hash.update(chunk);
    await writeAll(handle, chunk);
    bytes += chunk.byteLength;
  }
  return { bytes, hash };
}

async function linkFinal(tmpPath: string, finalPath: string): Promise<void> {
  try {
    await link(tmpPath, finalPath);
  } catch (error) {
    if (!isErrno(error, 'EEXIST')) {
      throw error;
    }
    const existing = await lstatOrNull(finalPath);
    if (existing === null || !existing.isFile()) {
      throw new Error('media object is not a regular file');
    }
  }
}

async function writeObject(
  tmpDir: string,
  finalPath: string,
  chunks: AsyncIterable<Uint8Array>,
): Promise<{ bytes: number; sha256: Buffer }> {
  const tmpPath = join(tmpDir, randomBytes(16).toString('hex'));
  const handle = await openFile(tmpPath, 'wx', FILE_MODE);
  try {
    const { bytes, hash } = await writeChunks(handle, chunks);
    await handle.sync();
    await handle.close();
    await linkFinal(tmpPath, finalPath);
    await rm(tmpPath, { force: true });
    return { bytes, sha256: hash.digest() };
  } catch (error) {
    await handle.close().catch(() => undefined);
    await rm(tmpPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function openObject(
  path: string,
  range: ByteRange | undefined,
): Promise<{ stream: NodeJS.ReadableStream; size: number } | null> {
  let handle: FileHandle;
  try {
    handle = await openFile(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (error) {
    if (isErrno(error, 'ENOENT')) {
      return null;
    }
    throw error;
  }
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new Error('media object is not a regular file');
    }
    const bounds = range === undefined ? {} : { start: range.start, end: range.end };
    return { stream: handle.createReadStream(bounds), size: stats.size };
  } catch (error) {
    await handle.close().catch(() => undefined);
    throw error;
  }
}

export function createLocalStore(root: string): MediaStore {
  if (typeof root !== 'string' || !isAbsolute(root)) {
    throw new TypeError('root must be an absolute path');
  }
  const tmpDir = join(root, TMP_DIR);
  const shardDir = (key: string): string => join(root, key.slice(0, SHARD_LENGTH));
  const pathFor = (key: string): string => join(shardDir(key), key);

  return {
    async put(key, data) {
      assertKey(key);
      const chunks = toChunks(data);
      const finalPath = pathFor(key);
      await mkdir(tmpDir, { recursive: true, mode: DIR_MODE });
      await mkdir(shardDir(key), { recursive: true, mode: DIR_MODE });
      return writeObject(tmpDir, finalPath, chunks);
    },

    async open(key, range) {
      assertKey(key);
      assertRange(range);
      return openObject(pathFor(key), range);
    },

    async has(key) {
      assertKey(key);
      return (await lstatOrNull(pathFor(key)))?.isFile() ?? false;
    },

    async delete(key) {
      assertKey(key);
      try {
        await unlink(pathFor(key));
      } catch (error) {
        if (!isErrno(error, 'ENOENT')) {
          throw error;
        }
      }
    },
  };
}
