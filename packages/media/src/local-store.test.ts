import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLocalStore, type MediaStore } from './local-store.ts';

const KEY = '0123456789abcdef'.repeat(4);
const KEY_WITH_EXT = `${KEY}.jpg`;
const OTHER_KEY = 'fedcba9876543210'.repeat(4);

let dir: string;
let root: string;
let store: MediaStore;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'kronaut-media-'));
  root = join(dir, 'store');
  store = createLocalStore(root);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function readStored(key: string): Promise<Buffer> {
  const opened = await store.open(key);
  if (opened === null) {
    throw new Error(`missing object ${key}`);
  }
  return readAll(opened.stream);
}

function sha256(data: Uint8Array): Buffer {
  return createHash('sha256').update(data).digest();
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function tmpEntries(): Promise<string[]> {
  return readdir(join(root, '.tmp'));
}

describe('createLocalStore', () => {
  it.each(['', 'relative/path', './store', '..'])('rejects the non-absolute root %j', (value) => {
    expect(() => createLocalStore(value)).toThrow(TypeError);
  });

  it('does not touch the filesystem on creation', async () => {
    expect(await pathExists(root)).toBe(false);
  });
});

describe('local store round trip', () => {
  it('puts, opens, checks and deletes', async () => {
    const data = Buffer.from('hello media');

    expect(await store.has(KEY)).toBe(false);
    expect(await store.open(KEY)).toBeNull();

    const result = await store.put(KEY, data);
    expect(result.bytes).toBe(data.byteLength);
    expect(Buffer.isBuffer(result.sha256)).toBe(true);
    expect(result.sha256.equals(sha256(data))).toBe(true);

    expect(await store.has(KEY)).toBe(true);
    const opened = await store.open(KEY);
    if (opened === null) {
      throw new Error('missing object');
    }
    expect(opened.size).toBe(data.byteLength);
    expect((await readAll(opened.stream)).equals(data)).toBe(true);

    await store.delete(KEY);
    expect(await store.has(KEY)).toBe(false);
    expect(await store.open(KEY)).toBeNull();
  });

  it('stores under a two-character shard directory', async () => {
    await store.put(KEY_WITH_EXT, Buffer.from('x'));
    expect(await readdir(join(root, KEY.slice(0, 2)))).toEqual([KEY_WITH_EXT]);
  });

  it('streams an async iterable and reports bytes and sha256', async () => {
    const parts = [
      Buffer.from('alpha'),
      Buffer.alloc(0),
      Buffer.from('beta'),
      Buffer.from('gamma'),
    ];
    async function* source(): AsyncGenerator<Uint8Array> {
      for (const part of parts) {
        yield part;
      }
    }

    const result = await store.put(KEY, source());
    const whole = Buffer.concat(parts);
    expect(result.bytes).toBe(whole.byteLength);
    expect(result.sha256.equals(sha256(whole))).toBe(true);

    expect((await readStored(KEY)).equals(whole)).toBe(true);
  });

  it('handles an empty body and a large body', async () => {
    const empty = await store.put(KEY, new Uint8Array(0));
    expect(empty.bytes).toBe(0);
    expect(empty.sha256.equals(sha256(new Uint8Array(0)))).toBe(true);
    expect((await readStored(KEY)).byteLength).toBe(0);

    const large = Buffer.alloc(5 * 1024 * 1024 + 3, 0x5a);
    const result = await store.put(OTHER_KEY, large);
    expect(result.bytes).toBe(large.byteLength);
    expect(result.sha256.equals(sha256(large))).toBe(true);
    const opened = await store.open(OTHER_KEY);
    if (opened === null) {
      throw new Error('missing object');
    }
    expect(opened.size).toBe(large.byteLength);
    expect((await readAll(opened.stream)).equals(large)).toBe(true);
  });

  it('accepts a Node readable stream as the source', async () => {
    const data = Buffer.from('from a readable');
    const result = await store.put(KEY, Readable.from([data.subarray(0, 4), data.subarray(4)]));
    expect(result.sha256.equals(sha256(data))).toBe(true);
    expect((await readStored(KEY)).equals(data)).toBe(true);
  });

  it('delete is idempotent', async () => {
    await expect(store.delete(KEY)).resolves.toBeUndefined();
    await store.put(KEY, Buffer.from('x'));
    await expect(store.delete(KEY)).resolves.toBeUndefined();
    await expect(store.delete(KEY)).resolves.toBeUndefined();
    expect(await store.has(KEY)).toBe(false);
  });

  it('leaves no temp files behind after a successful put', async () => {
    await store.put(KEY, Buffer.from('x'));
    expect(await tmpEntries()).toEqual([]);
  });

  it('creates files and directories without group write or world access', async () => {
    await store.put(KEY, Buffer.from('x'));
    const file = await stat(join(root, KEY.slice(0, 2), KEY));
    expect(file.mode & 0o137).toBe(0);
    for (const path of [root, join(root, '.tmp'), join(root, KEY.slice(0, 2))]) {
      expect((await stat(path)).mode & 0o027).toBe(0);
    }
  });
});

describe('content addressing', () => {
  it('keeps the existing file when the key is already present', async () => {
    await store.put(KEY, Buffer.from('first'));
    const second = await store.put(KEY, Buffer.from('second!'));
    expect(second.bytes).toBe(7);
    expect(second.sha256.equals(sha256(Buffer.from('second!')))).toBe(true);

    expect((await readStored(KEY)).toString()).toBe('first');
    expect(await tmpEntries()).toEqual([]);
  });

  it('handles concurrent identical puts', async () => {
    const data = Buffer.alloc(256 * 1024, 0x42);
    async function* chunked(): AsyncGenerator<Uint8Array> {
      for (let offset = 0; offset < data.byteLength; offset += 4096) {
        yield data.subarray(offset, offset + 4096);
      }
    }

    const results = await Promise.all(
      Array.from({ length: 12 }, (_, index) => store.put(KEY, index % 2 === 0 ? data : chunked())),
    );

    for (const result of results) {
      expect(result.bytes).toBe(data.byteLength);
      expect(result.sha256.equals(sha256(data))).toBe(true);
    }
    expect((await readStored(KEY)).equals(data)).toBe(true);
    expect(await tmpEntries()).toEqual([]);
    expect(await readdir(join(root, KEY.slice(0, 2)))).toEqual([KEY]);
  });
});

describe('invalid keys', () => {
  const invalid = [
    '',
    'a'.repeat(63),
    'a'.repeat(65),
    'A'.repeat(64),
    `${KEY}.JPG`,
    `${KEY}.`,
    `${KEY}.jpg.png`,
    `${KEY}\n`,
    `${KEY}/`,
    `../${KEY}`,
    `${KEY.slice(0, 2)}/${KEY}`,
    `${KEY.slice(0, 32)}\0${KEY.slice(33)}`,
    `${KEY.slice(0, 32)}%2f${KEY.slice(35)}`,
    '..',
    '.tmp',
  ];

  it.each(invalid)('rejects %j without touching the filesystem', async (key) => {
    await expect(store.put(key, Buffer.from('x'))).rejects.toThrow(TypeError);
    await expect(store.open(key)).rejects.toThrow(TypeError);
    await expect(store.has(key)).rejects.toThrow(TypeError);
    await expect(store.delete(key)).rejects.toThrow(TypeError);
    expect(await pathExists(root)).toBe(false);
  });

  it('rejects a body of the wrong type before touching the filesystem', async () => {
    await expect(store.put(KEY, 'text' as unknown as Uint8Array)).rejects.toThrow(TypeError);
    await expect(store.put(KEY, null as unknown as Uint8Array)).rejects.toThrow(TypeError);
    expect(await pathExists(root)).toBe(false);
  });
});

describe('failed puts', () => {
  it('removes the temp file when the iterable throws', async () => {
    async function* failing(): AsyncGenerator<Uint8Array> {
      yield Buffer.from('partial data');
      yield Buffer.from('more partial data');
      throw new Error('upstream failed');
    }

    await expect(store.put(KEY, failing())).rejects.toThrow('upstream failed');
    expect(await tmpEntries()).toEqual([]);
    expect(await store.has(KEY)).toBe(false);
    expect(await store.open(KEY)).toBeNull();
  });

  it('removes the temp file when a chunk has the wrong type', async () => {
    async function* wrong(): AsyncGenerator<Uint8Array> {
      yield Buffer.from('fine');
      yield 'not bytes' as unknown as Uint8Array;
    }

    await expect(store.put(KEY, wrong())).rejects.toThrow(TypeError);
    expect(await tmpEntries()).toEqual([]);
    expect(await store.has(KEY)).toBe(false);
  });

  it('does not disturb an existing object when a later put fails', async () => {
    await store.put(KEY, Buffer.from('good'));
    async function* failing(): AsyncGenerator<Uint8Array> {
      yield Buffer.from('bad');
      throw new Error('boom');
    }

    await expect(store.put(KEY, failing())).rejects.toThrow('boom');
    expect((await readStored(KEY)).toString()).toBe('good');
    expect(await tmpEntries()).toEqual([]);
  });
});

describe('symlinks and non-regular files', () => {
  const secret = 'top secret';
  let target: string;

  beforeEach(async () => {
    target = join(dir, 'target.txt');
    await writeFile(target, secret);
    await mkdir(join(root, KEY.slice(0, 2)), { recursive: true });
  });

  it('refuses to open a symlink planted at a key path', async () => {
    await symlink(target, join(root, KEY.slice(0, 2), KEY));
    await expect(store.open(KEY)).rejects.toThrow();
    expect(await store.has(KEY)).toBe(false);
  });

  it('refuses to open a dangling symlink instead of reporting it missing', async () => {
    await symlink(join(dir, 'missing'), join(root, KEY.slice(0, 2), KEY));
    await expect(store.open(KEY)).rejects.toThrow();
  });

  it('refuses to put over a symlink and leaves the target untouched', async () => {
    await symlink(target, join(root, KEY.slice(0, 2), KEY));
    await expect(store.put(KEY, Buffer.from('overwrite'))).rejects.toThrow();
    expect((await readFile(target)).toString()).toBe(secret);
    expect(await tmpEntries()).toEqual([]);
  });

  it('deletes the symlink itself and never its target', async () => {
    await symlink(target, join(root, KEY.slice(0, 2), KEY));
    await store.delete(KEY);
    expect(await readdir(join(root, KEY.slice(0, 2)))).toEqual([]);
    expect((await readFile(target)).toString()).toBe(secret);
  });

  it('refuses a directory at a key path', async () => {
    await mkdir(join(root, KEY.slice(0, 2), KEY));
    await expect(store.open(KEY)).rejects.toThrow('not a regular file');
    expect(await store.has(KEY)).toBe(false);
    await expect(store.put(KEY, Buffer.from('x'))).rejects.toThrow('not a regular file');
    expect(await tmpEntries()).toEqual([]);
  });

  it('refuses to put over a dangling symlink', async () => {
    const missing = join(dir, 'missing');
    await symlink(missing, join(root, KEY.slice(0, 2), KEY));
    await expect(store.put(KEY, Buffer.from('x'))).rejects.toThrow('not a regular file');
    expect(await pathExists(missing)).toBe(false);
    expect(await tmpEntries()).toEqual([]);
  });

  it.skipIf(process.platform === 'win32')(
    'refuses a FIFO at a key path without blocking',
    async () => {
      execFileSync('mkfifo', [join(root, KEY.slice(0, 2), KEY)]);
      await expect(store.open(KEY)).rejects.toThrow('not a regular file');
      expect(await store.has(KEY)).toBe(false);
    },
    5000,
  );
});
