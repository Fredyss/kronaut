import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CredentialError } from './errors.ts';
import { createKeyring, keyringFromEnv } from './keyring.ts';

function failure(fn: () => unknown): CredentialError {
  try {
    fn();
  } catch (error) {
    if (error instanceof CredentialError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected a CredentialError');
}

describe('createKeyring', () => {
  it('uses the highest version as current and lists versions ascending', () => {
    const keyring = createKeyring(
      new Map([
        [3, randomBytes(32)],
        [1, randomBytes(32)],
        [32767, randomBytes(32)],
      ]),
    );
    expect(keyring.current).toBe(32767);
    expect(keyring.versions()).toEqual([1, 3, 32767]);
  });

  it('returns the stored key bytes', () => {
    const key = randomBytes(32);
    const keyring = createKeyring(new Map([[1, key]]));
    expect(Buffer.from(keyring.key(1)).equals(key)).toBe(true);
  });

  it('rejects an empty keyring', () => {
    expect(failure(() => createKeyring(new Map())).code).toBe('invalid_key');
  });

  it.each([0, -1, 1.5, 32768, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects version %s',
    (version) => {
      expect(failure(() => createKeyring(new Map([[version, randomBytes(32)]]))).code).toBe(
        'invalid_key',
      );
    },
  );

  it.each([0, 16, 31, 33, 64])('rejects a %i byte key', (length) => {
    expect(failure(() => createKeyring(new Map([[1, randomBytes(length)]]))).code).toBe(
      'invalid_key',
    );
  });

  it('rejects one bad key among valid ones', () => {
    const keys = new Map([
      [1, randomBytes(32)],
      [2, randomBytes(31)],
    ]);
    expect(failure(() => createKeyring(keys)).code).toBe('invalid_key');
  });

  it('throws unknown_kek for a version that is not present', () => {
    const keyring = createKeyring(new Map([[1, randomBytes(32)]]));
    expect(failure(() => keyring.key(2)).code).toBe('unknown_kek');
    expect(failure(() => keyring.key(0)).code).toBe('unknown_kek');
    expect(failure(() => keyring.key(1.5)).code).toBe('unknown_kek');
  });

  it('copies the key bytes on the way in and on the way out', () => {
    const key = randomBytes(32);
    const original = Buffer.from(key);
    const keyring = createKeyring(new Map([[1, key]]));
    key.fill(0);
    expect(Buffer.from(keyring.key(1)).equals(original)).toBe(true);
    keyring.key(1).fill(0);
    expect(Buffer.from(keyring.key(1)).equals(original)).toBe(true);
  });

  it('does not let callers mutate the version list', () => {
    const keyring = createKeyring(new Map([[1, randomBytes(32)]]));
    const versions = keyring.versions() as number[];
    versions.push(99);
    expect(keyring.versions()).toEqual([1]);
  });
});

describe('keyringFromEnv', () => {
  const never = (): string => {
    throw new Error('readFile must not be called');
  };

  it('reads a base64 key', () => {
    const key = randomBytes(32);
    const keyring = keyringFromEnv({ KRONAUT_KEK_1: key.toString('base64') }, never);
    expect(keyring.current).toBe(1);
    expect(Buffer.from(keyring.key(1)).equals(key)).toBe(true);
  });

  it('reads a base64url key with and without padding', () => {
    const key = Buffer.alloc(32, 0xfb);
    const url = key.toString('base64url');
    expect(url).toMatch(/[-_]/);
    for (const value of [url, `${url}=`]) {
      const keyring = keyringFromEnv({ KRONAUT_KEK_1: value }, never);
      expect(Buffer.from(keyring.key(1)).equals(key)).toBe(true);
    }
  });

  it('reads a standard base64 key with the + and / alphabet', () => {
    const key = Buffer.alloc(32, 0xfb);
    const standard = key.toString('base64');
    expect(standard).toMatch(/[+/]/);
    const keyring = keyringFromEnv({ KRONAUT_KEK_1: standard }, never);
    expect(Buffer.from(keyring.key(1)).equals(key)).toBe(true);
  });

  it('reads several versions and takes the highest as current', () => {
    const k1 = randomBytes(32);
    const k2 = randomBytes(32);
    const k10 = randomBytes(32);
    const keyring = keyringFromEnv(
      {
        KRONAUT_KEK_10: k10.toString('base64'),
        KRONAUT_KEK_2: k2.toString('base64url'),
        KRONAUT_KEK_1: k1.toString('base64'),
      },
      never,
    );
    expect(keyring.current).toBe(10);
    expect(keyring.versions()).toEqual([1, 2, 10]);
    expect(Buffer.from(keyring.key(2)).equals(k2)).toBe(true);
  });

  it.each([30, 31, 33, 64])('rejects a %i byte key', (length) => {
    const value = randomBytes(length).toString('base64');
    expect(failure(() => keyringFromEnv({ KRONAUT_KEK_1: value }, never)).code).toBe('invalid_key');
  });

  it.each([
    ['empty', ''],
    ['whitespace padded', ` ${randomBytes(32).toString('base64')}\n`],
    ['hex', randomBytes(32).toString('hex')],
    ['invalid characters', '!'.repeat(43)],
    ['mixed alphabets', `${'+'.repeat(21)}${'-'.repeat(22)}`],
    ['double padding', `${randomBytes(32).toString('base64')}=`],
  ])('rejects %s', (_label, value) => {
    expect(failure(() => keyringFromEnv({ KRONAUT_KEK_1: value }, never)).code).toBe('invalid_key');
  });

  it('rejects non-canonical trailing bits', () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const canonical = Buffer.alloc(32, 0x11).toString('base64url');
    const last = alphabet.indexOf(canonical.slice(-1));
    expect(last % 4).toBe(0);
    const tampered = `${canonical.slice(0, -1)}${alphabet[last + 1]}`;
    expect(failure(() => keyringFromEnv({ KRONAUT_KEK_1: tampered }, never)).code).toBe(
      'invalid_key',
    );
  });

  it('reads a key from a _FILE path and trims it', () => {
    const key = randomBytes(32);
    const reads: string[] = [];
    const keyring = keyringFromEnv({ KRONAUT_KEK_3_FILE: '/run/secrets/kek3' }, (path) => {
      reads.push(path);
      return `\n  ${key.toString('base64url')}\r\n`;
    });
    expect(reads).toEqual(['/run/secrets/kek3']);
    expect(keyring.current).toBe(3);
    expect(Buffer.from(keyring.key(3)).equals(key)).toBe(true);
  });

  it('mixes direct and _FILE forms across versions', () => {
    const k1 = randomBytes(32);
    const k2 = randomBytes(32);
    const keyring = keyringFromEnv(
      { KRONAUT_KEK_1: k1.toString('base64'), KRONAUT_KEK_2_FILE: '/k2' },
      () => k2.toString('base64'),
    );
    expect(keyring.versions()).toEqual([1, 2]);
    expect(Buffer.from(keyring.key(2)).equals(k2)).toBe(true);
  });

  it('uses fs.readFileSync by default', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kronaut-kek-'));
    try {
      const key = randomBytes(32);
      const path = join(dir, 'kek');
      writeFileSync(path, `${key.toString('base64')}\n`);
      const keyring = keyringFromEnv({ KRONAUT_KEK_1_FILE: path });
      expect(Buffer.from(keyring.key(1)).equals(key)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects an unreadable _FILE', () => {
    const error = failure(() =>
      keyringFromEnv({ KRONAUT_KEK_1_FILE: '/missing' }, () => {
        throw new Error('ENOENT: /missing');
      }),
    );
    expect(error.code).toBe('invalid_key');
    expect(error.cause).toBeUndefined();
  });

  it('rejects a _FILE with bad contents', () => {
    expect(
      failure(() => keyringFromEnv({ KRONAUT_KEK_1_FILE: '/k' }, () => 'not a key')).code,
    ).toBe('invalid_key');
  });

  it('rejects both forms for the same version', () => {
    const value = randomBytes(32).toString('base64');
    const env = { KRONAUT_KEK_1: value, KRONAUT_KEK_1_FILE: '/k' };
    expect(failure(() => keyringFromEnv(env, () => value)).code).toBe('invalid_key');
  });

  it('rejects a leading-zero version', () => {
    const value = randomBytes(32).toString('base64');
    expect(failure(() => keyringFromEnv({ KRONAUT_KEK_01: value }, never)).code).toBe(
      'invalid_key',
    );
    expect(
      failure(() =>
        keyringFromEnv({ KRONAUT_KEK_1: value, KRONAUT_KEK_02_FILE: '/k' }, () => value),
      ).code,
    ).toBe('invalid_key');
  });

  it.each(['KRONAUT_KEK_0', 'KRONAUT_KEK_32768', 'KRONAUT_KEK_99999999999999999999'])(
    'rejects out-of-range version %s',
    (name) => {
      const value = randomBytes(32).toString('base64');
      expect(failure(() => keyringFromEnv({ [name]: value }, never)).code).toBe('invalid_key');
    },
  );

  it('rejects an environment with no keys', () => {
    expect(failure(() => keyringFromEnv({}, never)).code).toBe('invalid_key');
    expect(
      failure(() => keyringFromEnv({ PATH: '/bin', KRONAUT_KEK_1: undefined }, never)).code,
    ).toBe('invalid_key');
  });

  it('ignores other environment names', () => {
    const key = randomBytes(32);
    const junk = 'not a key';
    const keyring = keyringFromEnv(
      {
        KRONAUT_KEK_1: key.toString('base64'),
        KRONAUT_KEK: junk,
        KRONAUT_KEK_: junk,
        KRONAUT_KEK_X: junk,
        KRONAUT_KEK_1_X: junk,
        KRONAUT_KEK_1_FILE_X: junk,
        KRONAUT_KEK_1A: junk,
        XKRONAUT_KEK_2: junk,
        kronaut_kek_2: junk,
        KRONAUT_KEK_2: undefined,
        KRONAUT_KEK_3_FILE: undefined,
        OTHER: junk,
      },
      never,
    );
    expect(keyring.versions()).toEqual([1]);
  });
});
