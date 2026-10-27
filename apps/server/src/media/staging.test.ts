import { mkdtemp, readdir, readFile, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStaging, type Staging } from './staging.ts';

const KEY = 'ab'.repeat(32);
let root: string;
let staging: Staging;

beforeEach(async () => {
  root = join(await mkdtemp(join(tmpdir(), 'kronaut-staging-')), '.staging');
  staging = createStaging(root);
});

afterEach(async () => {
  await rm(join(root, '..'), { recursive: true, force: true });
});

describe('staging', () => {
  it('receives into a temp file and places it as a part', async () => {
    const temp = await staging.receive(new Uint8Array([1, 2, 3]));
    expect(temp.startsWith(join(root, '.incoming'))).toBe(true);
    expect((await stat(temp)).mode & 0o777).toBe(0o640);
    await staging.place(temp, KEY, 1);
    const placed = join(root, KEY, '1.part');
    expect([...(await readFile(placed))]).toEqual([1, 2, 3]);
    expect((await stat(join(root, KEY))).mode & 0o777).toBe(0o750);
    expect(await readdir(join(root, '.incoming'))).toEqual([]);
    expect(staging.directory(KEY)).toBe(join(root, KEY));
  });

  it('lists part sizes and replaces a repeated part', async () => {
    expect(await staging.parts(KEY)).toEqual(new Map());
    await staging.place(await staging.receive(new Uint8Array(5)), KEY, 2);
    await staging.place(await staging.receive(new Uint8Array(4)), KEY, 1);
    await staging.place(await staging.receive(new Uint8Array(7)), KEY, 2);
    expect(await staging.parts(KEY)).toEqual(
      new Map([
        [1, 4],
        [2, 7],
      ]),
    );
  });

  it('discards a temp file and removes a key directory, tolerating missing ones', async () => {
    const temp = await staging.receive(new Uint8Array(2));
    await staging.discard(temp);
    await staging.discard(temp);
    expect(await readdir(join(root, '.incoming'))).toEqual([]);
    await staging.place(await staging.receive(new Uint8Array(2)), KEY, 1);
    await staging.remove(KEY);
    await staging.remove(KEY);
    expect(await staging.parts(KEY)).toEqual(new Map());
  });

  it('sweeps incoming temp files older than the cutoff and counts a missing dir as 0', async () => {
    expect(await staging.sweepIncoming(3_600_000)).toBe(0);
    const stale = await staging.receive(new Uint8Array(1));
    const fresh = await staging.receive(new Uint8Array(1));
    const past = new Date(Date.now() - 2 * 3_600_000);
    await utimes(stale, past, past);
    expect(await staging.sweepIncoming(3_600_000)).toBe(1);
    expect(await readdir(join(root, '.incoming'))).toEqual([fresh.slice(-32)]);
  });

  it.each(['', 'AB'.repeat(32), 'ab'.repeat(31), '../etc', `${KEY}/x`])(
    'rejects key %j',
    async (key) => {
      expect(() => staging.directory(key)).toThrow(TypeError);
      await expect(staging.remove(key)).rejects.toThrow(TypeError);
      await expect(staging.parts(key)).rejects.toThrow(TypeError);
    },
  );

  it('rejects temp paths outside the incoming directory and bad part numbers', async () => {
    const temp = await staging.receive(new Uint8Array(1));
    await expect(staging.place(join(root, 'x'), KEY, 1)).rejects.toThrow(TypeError);
    await expect(staging.discard('/etc/passwd')).rejects.toThrow(TypeError);
    await expect(staging.place(temp, KEY, 0)).rejects.toThrow(TypeError);
    await expect(staging.place(temp, KEY, 1.5)).rejects.toThrow(TypeError);
  });
});
