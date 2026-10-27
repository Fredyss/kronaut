import { createDecipheriv, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { CredentialAad, SealedCredential } from './envelope.ts';
import { openCredential, rewrapCredential, sealCredential } from './envelope.ts';
import { CredentialError } from './errors.ts';
import { createKeyring } from './keyring.ts';

const CREDENTIAL_ID = '0197c3a2-6d4e-7b1a-8c3f-5e2d9a4b7c10';
const WORKSPACE_ID = '0197c3a2-6d4e-7b1a-8c3f-5e2d9a4b7c11';
const AAD: CredentialAad = {
  credentialId: CREDENTIAL_ID,
  workspaceId: WORKSPACE_ID,
  provider: 'instagram',
};

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

function keyringOf(...versions: number[]) {
  return createKeyring(new Map(versions.map((version) => [version, randomBytes(32)] as const)));
}

function clone(sealed: SealedCredential): SealedCredential {
  return {
    ciphertext: Buffer.from(sealed.ciphertext),
    nonce: Buffer.from(sealed.nonce),
    wrappedDek: Buffer.from(sealed.wrappedDek),
    kekVersion: sealed.kekVersion,
    aadV: sealed.aadV,
  };
}

function flip(buffer: Buffer, index: number): Buffer {
  const copy = Buffer.from(buffer);
  copy[index] = (copy[index] ?? 0) ^ 0x01;
  return copy;
}

describe('sealCredential and openCredential', () => {
  it.each([
    ['empty', 0],
    ['one byte', 1],
    ['64 KiB', 64 * 1024],
  ])('round-trips %s plaintext', (_label, length) => {
    const keyring = keyringOf(1);
    const plaintext = randomBytes(length);
    const sealed = sealCredential(keyring, AAD, plaintext);
    const opened = openCredential(keyring, AAD, sealed);
    expect(Buffer.isBuffer(opened)).toBe(true);
    expect(opened.equals(plaintext)).toBe(true);
  });

  it('accepts a plain Uint8Array and a subarray view', () => {
    const keyring = keyringOf(1);
    const backing = randomBytes(32);
    const view = new Uint8Array(backing.buffer, backing.byteOffset + 4, 10);
    const sealed = sealCredential(keyring, AAD, view);
    expect(openCredential(keyring, AAD, sealed).equals(Buffer.from(view))).toBe(true);
  });

  it('produces the documented sealed layout', () => {
    const keyring = keyringOf(1, 4);
    const plaintext = randomBytes(100);
    const sealed = sealCredential(keyring, AAD, plaintext);
    expect(sealed.aadV).toBe(1);
    expect(sealed.kekVersion).toBe(4);
    expect(sealed.nonce.length).toBe(12);
    expect(sealed.wrappedDek.length).toBe(60);
    expect(sealed.ciphertext.length).toBe(plaintext.length + 16);
  });

  it('matches the documented wire format when decrypted independently', () => {
    const keyring = keyringOf(1, 7);
    const plaintext = Buffer.from('independent verification');
    const sealed = sealCredential(keyring, AAD, plaintext);

    const gcmOpen = (key: Uint8Array, nonce: Buffer, aad: string, data: Buffer): Buffer => {
      const decipher = createDecipheriv('aes-256-gcm', key, nonce);
      decipher.setAAD(Buffer.from(aad, 'utf8'));
      decipher.setAuthTag(data.subarray(data.length - 16));
      return Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()]);
    };

    const contentAad = `1|${CREDENTIAL_ID}|${WORKSPACE_ID}|instagram`;
    const dek = gcmOpen(
      keyring.key(7),
      sealed.wrappedDek.subarray(0, 12),
      `kronaut-dek|7|${contentAad}`,
      sealed.wrappedDek.subarray(12),
    );
    expect(dek.length).toBe(32);
    expect(gcmOpen(dek, sealed.nonce, contentAad, sealed.ciphertext).equals(plaintext)).toBe(true);
  });

  it('produces different output for two seals of the same plaintext', () => {
    const keyring = keyringOf(1);
    const plaintext = Buffer.from('same plaintext');
    const a = sealCredential(keyring, AAD, plaintext);
    const b = sealCredential(keyring, AAD, plaintext);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
    expect(a.nonce.equals(b.nonce)).toBe(false);
    expect(a.wrappedDek.equals(b.wrappedDek)).toBe(false);
  });

  it('does not modify the plaintext or the sealed input', () => {
    const keyring = keyringOf(1);
    const plaintext = Buffer.from('keep me');
    const sealed = sealCredential(keyring, AAD, plaintext);
    const before = clone(sealed);
    openCredential(keyring, AAD, sealed);
    expect(plaintext.toString()).toBe('keep me');
    expect(sealed.ciphertext.equals(before.ciphertext)).toBe(true);
    expect(sealed.nonce.equals(before.nonce)).toBe(true);
    expect(sealed.wrappedDek.equals(before.wrappedDek)).toBe(true);
  });

  it('fails to open under a different key of the same version', () => {
    const sealed = sealCredential(keyringOf(1), AAD, Buffer.from('secret'));
    expect(failure(() => openCredential(keyringOf(1), AAD, sealed)).code).toBe('decrypt_failed');
  });
});

describe('AAD binding', () => {
  const keyring = keyringOf(1);
  const sealed = sealCredential(keyring, AAD, Buffer.from('bound'));

  it.each([
    ['credentialId', { ...AAD, credentialId: '0197c3a2-6d4e-7b1a-8c3f-5e2d9a4b7c12' }],
    ['workspaceId', { ...AAD, workspaceId: '0197c3a2-6d4e-7b1a-8c3f-5e2d9a4b7c12' }],
    ['provider', { ...AAD, provider: 'bluesky' }],
    ['swapped ids', { ...AAD, credentialId: WORKSPACE_ID, workspaceId: CREDENTIAL_ID }],
    ['provider prefix', { ...AAD, provider: 'instagra' }],
  ])('fails when %s differs', (_label, other) => {
    expect(failure(() => openCredential(keyring, other, sealed)).code).toBe('decrypt_failed');
  });

  it('treats an uppercase uuid as its lowercase form', () => {
    const upper: CredentialAad = {
      ...AAD,
      credentialId: CREDENTIAL_ID.toUpperCase(),
      workspaceId: WORKSPACE_ID.toUpperCase(),
    };
    expect(openCredential(keyring, upper, sealed).toString()).toBe('bound');
    const sealedUpper = sealCredential(keyring, upper, Buffer.from('upper'));
    expect(openCredential(keyring, AAD, sealedUpper).toString()).toBe('upper');
  });

  it('binds the wrapped DEK to the AAD as well as the content', () => {
    const rotated = keyringOf(1, 2);
    const first = sealCredential(
      createKeyring(new Map([[1, rotated.key(1)]])),
      AAD,
      Buffer.from('x'),
    );
    const other = { ...AAD, provider: 'bluesky' };
    expect(failure(() => rewrapCredential(rotated, other, first)).code).toBe('decrypt_failed');
  });

  const invalid: readonly [string, Partial<CredentialAad>][] = [
    ['credentialId not a uuid', { credentialId: 'not-a-uuid' }],
    ['credentialId empty', { credentialId: '' }],
    ['credentialId without hyphens', { credentialId: CREDENTIAL_ID.replaceAll('-', '') }],
    ['credentialId with trailing newline', { credentialId: `${CREDENTIAL_ID}\n` }],
    ['credentialId with separator', { credentialId: `${CREDENTIAL_ID}|x` }],
    ['workspaceId not a uuid', { workspaceId: 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz' }],
    ['provider empty', { provider: '' }],
    ['provider uppercase', { provider: 'Instagram' }],
    ['provider with hyphen', { provider: 'ig-basic' }],
    ['provider with separator', { provider: 'a|b' }],
    ['provider with newline', { provider: 'bluesky\n' }],
    ['provider too long', { provider: 'a'.repeat(41) }],
  ];

  it.each(invalid)('rejects %s', (_label, patch) => {
    const bad = { ...AAD, ...patch };
    expect(failure(() => sealCredential(keyring, bad, Buffer.from('x'))).code).toBe('invalid_aad');
    expect(failure(() => openCredential(keyring, bad, sealed)).code).toBe('invalid_aad');
    expect(failure(() => rewrapCredential(keyring, bad, sealed)).code).toBe('invalid_aad');
  });

  it('accepts a provider of exactly 40 characters', () => {
    const edge = { ...AAD, provider: `${'a1_'.repeat(13)}z` };
    expect(edge.provider.length).toBe(40);
    const edgeSealed = sealCredential(keyring, edge, Buffer.from('edge'));
    expect(openCredential(keyring, edge, edgeSealed).toString()).toBe('edge');
  });
});

describe('tampering', () => {
  const keyring = keyringOf(1);
  const sealed = sealCredential(keyring, AAD, randomBytes(48));

  it.each([
    ['ciphertext first byte', (s: SealedCredential) => (s.ciphertext = flip(s.ciphertext, 0))],
    [
      'ciphertext last body byte',
      (s: SealedCredential) => (s.ciphertext = flip(s.ciphertext, s.ciphertext.length - 17)),
    ],
    [
      'ciphertext tag first byte',
      (s: SealedCredential) => (s.ciphertext = flip(s.ciphertext, s.ciphertext.length - 16)),
    ],
    [
      'ciphertext tag last byte',
      (s: SealedCredential) => (s.ciphertext = flip(s.ciphertext, s.ciphertext.length - 1)),
    ],
    ['nonce first byte', (s: SealedCredential) => (s.nonce = flip(s.nonce, 0))],
    ['nonce last byte', (s: SealedCredential) => (s.nonce = flip(s.nonce, 11))],
    ['wrapped DEK nonce region', (s: SealedCredential) => (s.wrappedDek = flip(s.wrappedDek, 0))],
    ['wrapped DEK body region', (s: SealedCredential) => (s.wrappedDek = flip(s.wrappedDek, 12))],
    ['wrapped DEK body end', (s: SealedCredential) => (s.wrappedDek = flip(s.wrappedDek, 43))],
    [
      'wrapped DEK tag first byte',
      (s: SealedCredential) => (s.wrappedDek = flip(s.wrappedDek, 44)),
    ],
    ['wrapped DEK tag last byte', (s: SealedCredential) => (s.wrappedDek = flip(s.wrappedDek, 59))],
    [
      'ciphertext swapped with another credential',
      (s: SealedCredential) =>
        (s.ciphertext = sealCredential(keyring, AAD, randomBytes(48)).ciphertext),
    ],
    [
      'wrapped DEK swapped with another credential',
      (s: SealedCredential) =>
        (s.wrappedDek = sealCredential(keyring, AAD, randomBytes(48)).wrappedDek),
    ],
  ])('fails on %s', (_label, mutate) => {
    const tampered = clone(sealed);
    mutate(tampered);
    expect(failure(() => openCredential(keyring, AAD, tampered)).code).toBe('decrypt_failed');
  });

  it('fails on every single-byte flip in every region', () => {
    for (const field of ['ciphertext', 'nonce', 'wrappedDek'] as const) {
      for (let index = 0; index < sealed[field].length; index++) {
        const tampered = clone(sealed);
        tampered[field] = flip(tampered[field], index);
        expect(failure(() => openCredential(keyring, AAD, tampered)).code).toBe('decrypt_failed');
      }
    }
  });

  it.each([
    [
      'ciphertext missing a byte',
      (s: SealedCredential) => (s.ciphertext = s.ciphertext.subarray(0, -1)),
    ],
    ['ciphertext shorter than a tag', (s: SealedCredential) => (s.ciphertext = Buffer.alloc(15))],
    ['ciphertext empty', (s: SealedCredential) => (s.ciphertext = Buffer.alloc(0))],
    [
      'ciphertext with an extra byte',
      (s: SealedCredential) => (s.ciphertext = Buffer.concat([s.ciphertext, Buffer.from([0])])),
    ],
    ['nonce too short', (s: SealedCredential) => (s.nonce = s.nonce.subarray(0, 11))],
    [
      'nonce too long',
      (s: SealedCredential) => (s.nonce = Buffer.concat([s.nonce, Buffer.from([0])])),
    ],
    ['nonce empty', (s: SealedCredential) => (s.nonce = Buffer.alloc(0))],
    [
      'wrapped DEK too short',
      (s: SealedCredential) => (s.wrappedDek = s.wrappedDek.subarray(0, 59)),
    ],
    [
      'wrapped DEK too long',
      (s: SealedCredential) => (s.wrappedDek = Buffer.concat([s.wrappedDek, Buffer.from([0])])),
    ],
    ['wrapped DEK empty', (s: SealedCredential) => (s.wrappedDek = Buffer.alloc(0))],
  ])('fails on %s', (_label, mutate) => {
    const truncated = clone(sealed);
    mutate(truncated);
    expect(failure(() => openCredential(keyring, AAD, truncated)).code).toBe('decrypt_failed');
  });

  it('fails to rewrap a truncated wrapped DEK', () => {
    for (const wrappedDek of [sealed.wrappedDek.subarray(0, 59), Buffer.alloc(0)]) {
      const truncated = { ...clone(sealed), wrappedDek };
      expect(failure(() => rewrapCredential(keyring, AAD, truncated)).code).toBe('decrypt_failed');
    }
  });

  it('fails on malformed buffers at runtime', () => {
    const broken = { ...clone(sealed), nonce: undefined } as unknown as SealedCredential;
    expect(failure(() => openCredential(keyring, AAD, broken)).code).toBe('decrypt_failed');
  });

  it.each([0, 2, -1, 1.5, Number.NaN])('rejects aadV %s as unsupported', (aadV) => {
    const other = { ...clone(sealed), aadV };
    expect(failure(() => openCredential(keyring, AAD, other)).code).toBe('unsupported_aad_version');
    expect(failure(() => rewrapCredential(keyring, AAD, other)).code).toBe(
      'unsupported_aad_version',
    );
  });

  it.each([9, 0, 1.5, -1])('rejects kekVersion %s as unknown', (kekVersion) => {
    const other = { ...clone(sealed), kekVersion };
    expect(failure(() => openCredential(keyring, AAD, other)).code).toBe('unknown_kek');
    expect(failure(() => rewrapCredential(keyring, AAD, other)).code).toBe('unknown_kek');
  });

  it('fails when kekVersion is relabelled to another existing version', () => {
    const both = keyringOf(1, 2);
    const original = sealCredential(
      createKeyring(new Map([[1, both.key(1)]])),
      AAD,
      Buffer.from('v'),
    );
    const relabelled = { ...clone(original), kekVersion: 2 };
    expect(failure(() => openCredential(both, AAD, relabelled)).code).toBe('decrypt_failed');
  });
});

describe('rewrapCredential', () => {
  it('moves a credential to the current KEK so the old one can be retired', () => {
    const k1 = randomBytes(32);
    const k2 = randomBytes(32);
    const plaintext = randomBytes(200);
    const sealed = sealCredential(createKeyring(new Map([[1, k1]])), AAD, plaintext);
    expect(sealed.kekVersion).toBe(1);

    const rotating = createKeyring(
      new Map([
        [1, k1],
        [2, k2],
      ]),
    );
    const rewrapped = rewrapCredential(rotating, AAD, sealed);
    expect(rewrapped.kekVersion).toBe(2);
    expect(rewrapped.aadV).toBe(1);
    expect(rewrapped.wrappedDek.length).toBe(60);
    expect(rewrapped.wrappedDek.equals(sealed.wrappedDek)).toBe(false);
    expect(rewrapped.ciphertext.equals(sealed.ciphertext)).toBe(true);
    expect(rewrapped.nonce.equals(sealed.nonce)).toBe(true);

    expect(openCredential(rotating, AAD, rewrapped).equals(plaintext)).toBe(true);
    expect(openCredential(rotating, AAD, sealed).equals(plaintext)).toBe(true);

    const retired = createKeyring(new Map([[2, k2]]));
    expect(openCredential(retired, AAD, rewrapped).equals(plaintext)).toBe(true);
    expect(failure(() => openCredential(retired, AAD, sealed)).code).toBe('unknown_kek');
  });

  it('leaves the input untouched', () => {
    const k1 = randomBytes(32);
    const sealed = sealCredential(createKeyring(new Map([[1, k1]])), AAD, Buffer.from('keep'));
    const before = clone(sealed);
    const rotating = createKeyring(
      new Map([
        [1, k1],
        [2, randomBytes(32)],
      ]),
    );
    const rewrapped = rewrapCredential(rotating, AAD, sealed);
    expect(sealed.kekVersion).toBe(1);
    expect(sealed.wrappedDek.equals(before.wrappedDek)).toBe(true);
    expect(rewrapped.ciphertext).not.toBe(sealed.ciphertext);
    expect(rewrapped.nonce).not.toBe(sealed.nonce);
  });

  it('uses a fresh wrap nonce even when the KEK version does not change', () => {
    const keyring = keyringOf(1);
    const sealed = sealCredential(keyring, AAD, Buffer.from('same kek'));
    const rewrapped = rewrapCredential(keyring, AAD, sealed);
    expect(rewrapped.kekVersion).toBe(1);
    expect(rewrapped.wrappedDek.subarray(0, 12).equals(sealed.wrappedDek.subarray(0, 12))).toBe(
      false,
    );
    expect(openCredential(keyring, AAD, rewrapped).toString()).toBe('same kek');
  });

  it('can be repeated across several rotations', () => {
    const keys = [randomBytes(32), randomBytes(32), randomBytes(32)] as const;
    let sealed = sealCredential(createKeyring(new Map([[1, keys[0]]])), AAD, Buffer.from('hop'));
    for (const [from, to] of [
      [1, 2],
      [2, 3],
    ] as const) {
      const keyring = createKeyring(
        new Map([
          [from, keys[from - 1] ?? randomBytes(32)],
          [to, keys[to - 1] ?? randomBytes(32)],
        ]),
      );
      sealed = rewrapCredential(keyring, AAD, sealed);
      expect(sealed.kekVersion).toBe(to);
    }
    expect(openCredential(createKeyring(new Map([[3, keys[2]]])), AAD, sealed).toString()).toBe(
      'hop',
    );
  });

  it('fails with unknown_kek when the sealing KEK is gone', () => {
    const sealed = sealCredential(keyringOf(1), AAD, Buffer.from('gone'));
    expect(failure(() => rewrapCredential(keyringOf(2), AAD, sealed)).code).toBe('unknown_kek');
  });

  it('fails with decrypt_failed when the wrapped DEK was tampered', () => {
    const keyring = keyringOf(1);
    const sealed = sealCredential(keyring, AAD, Buffer.from('x'));
    const tampered = { ...clone(sealed), wrappedDek: flip(sealed.wrappedDek, 20) };
    expect(failure(() => rewrapCredential(keyring, AAD, tampered)).code).toBe('decrypt_failed');
  });
});

describe('key material hygiene', () => {
  function tracked(...versions: number[]) {
    const inner = keyringOf(...versions);
    const handed: Uint8Array[] = [];
    const keyring = {
      current: inner.current,
      versions: () => inner.versions(),
      key(version: number) {
        const key = inner.key(version);
        handed.push(key);
        return key;
      },
    };
    return { keyring, handed };
  }

  function allZero(buffers: readonly Uint8Array[]): boolean {
    return buffers.every((buffer) => buffer.every((byte) => byte === 0));
  }

  it('wipes every KEK copy after seal, open and rewrap', () => {
    const { keyring, handed } = tracked(1, 2);
    const sealed = sealCredential(keyring, AAD, Buffer.from('hygiene'));
    openCredential(keyring, AAD, sealed);
    rewrapCredential(keyring, AAD, sealed);
    expect(handed.length).toBe(4);
    expect(allZero(handed)).toBe(true);
  });

  it('wipes every KEK copy when open and rewrap fail', () => {
    const { keyring, handed } = tracked(1);
    const sealed = sealCredential(keyring, AAD, Buffer.from('hygiene'));
    const tampered = { ...clone(sealed), wrappedDek: flip(sealed.wrappedDek, 20) };
    failure(() => openCredential(keyring, AAD, tampered));
    failure(() => rewrapCredential(keyring, AAD, tampered));
    failure(() => openCredential(keyring, AAD, { ...clone(sealed), ciphertext: Buffer.alloc(4) }));
    expect(handed.length).toBe(5);
    expect(allZero(handed)).toBe(true);
  });
});
