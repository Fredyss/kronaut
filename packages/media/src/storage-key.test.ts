import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isStorageKey, STORAGE_KEY_RE, storageKey } from './storage-key.ts';

const WORKSPACE_A = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b';
const WORKSPACE_B = '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c';
const MASTER = createHash('sha256').update('master').digest();

describe('storageKey', () => {
  it('matches a vector computed with node:crypto', () => {
    const expected = createHash('sha256')
      .update(Buffer.concat([Buffer.from(WORKSPACE_A.replaceAll('-', ''), 'hex'), MASTER]))
      .digest('hex');
    expect(storageKey(WORKSPACE_A, MASTER)).toBe(expected);
  });

  it('matches a pinned vector', () => {
    expect(MASTER.toString('hex')).toBe(
      'fc613b4dfd6736a7bd268c8a0e74ed0d1c04a959f59dd74ef2874983fd443fc9',
    );
    expect(storageKey(WORKSPACE_A, MASTER)).toBe(
      '5b5ca68f707f68f2f4a3b3577665f96d77f1166e148eca9fefe41a49c4d514a0',
    );
  });

  it('is deterministic and matches the regex', () => {
    const first = storageKey(WORKSPACE_A, MASTER);
    expect(storageKey(WORKSPACE_A, MASTER)).toBe(first);
    expect(first).toMatch(STORAGE_KEY_RE);
    expect(first).toHaveLength(64);
  });

  it('differs per workspace for the same sha', () => {
    expect(storageKey(WORKSPACE_A, MASTER)).not.toBe(storageKey(WORKSPACE_B, MASTER));
  });

  it('differs per master sha for the same workspace', () => {
    const other = createHash('sha256').update('other').digest();
    expect(storageKey(WORKSPACE_A, MASTER)).not.toBe(storageKey(WORKSPACE_A, other));
  });

  it('treats the uuid case-insensitively', () => {
    expect(storageKey(WORKSPACE_A.toUpperCase(), MASTER)).toBe(storageKey(WORKSPACE_A, MASTER));
  });

  it('appends a valid extension', () => {
    const base = storageKey(WORKSPACE_A, MASTER);
    for (const ext of ['jp', 'png', 'webp', 'avif', 'mp4a', 'a1b2c']) {
      const key = storageKey(WORKSPACE_A, MASTER, ext);
      expect(key).toBe(`${base}.${ext}`);
      expect(key).toMatch(STORAGE_KEY_RE);
    }
    expect(storageKey(WORKSPACE_A, MASTER, undefined)).toBe(base);
  });

  it.each(['', 'a', 'abcdef', 'JPG', 'j.g', '.jpg', 'jp g', 'jpg\n', 'ｊｐｇ', 'jp\0'])(
    'rejects extension %j',
    (ext) => {
      expect(() => storageKey(WORKSPACE_A, MASTER, ext)).toThrow(TypeError);
    },
  );

  it.each([
    '',
    'not-a-uuid',
    '0190a1b20c3d47e5f8a9b0c1d2e3f4a5b',
    '{0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b}',
    '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b\n',
    ' 0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
    '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5',
    '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5bc',
    '0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5g',
  ])('rejects workspace id %j', (workspaceId) => {
    expect(() => storageKey(workspaceId, MASTER)).toThrow(TypeError);
  });

  it.each([0, 1, 31, 33, 64])('rejects a %d-byte master sha', (length) => {
    expect(() => storageKey(WORKSPACE_A, new Uint8Array(length))).toThrow(TypeError);
  });
});

describe('isStorageKey', () => {
  const hex = 'a'.repeat(64);

  it('accepts 64 lowercase hex with an optional extension', () => {
    expect(isStorageKey(hex)).toBe(true);
    expect(isStorageKey(`${hex}.jpg`)).toBe(true);
    expect(isStorageKey(`${hex}.ab`)).toBe(true);
    expect(isStorageKey(`${hex}.abcde`)).toBe(true);
  });

  it.each([
    '',
    'a'.repeat(63),
    'a'.repeat(65),
    'A'.repeat(64),
    `${hex}.`,
    `${hex}.a`,
    `${hex}.abcdef`,
    `${hex}.JPG`,
    `${hex}.jpg.png`,
    `${hex}\n`,
    `\n${hex}`,
    `${hex}/`,
    `../${hex}`,
    `${hex.slice(1)}\0`,
    `${'g'.repeat(64)}`,
  ])('rejects %j', (value) => {
    expect(isStorageKey(value)).toBe(false);
  });

  it('is identical to the database CHECK constraint', () => {
    const schema = readFileSync(
      fileURLToPath(new URL('../../db/schema/v1.sql', import.meta.url)),
      'utf8',
    );
    const match = /storage_key text NOT NULL UNIQUE CHECK \(storage_key ~ '([^']+)'\)/.exec(schema);
    expect(match?.[1]).toBe(STORAGE_KEY_RE.source);
  });
});
