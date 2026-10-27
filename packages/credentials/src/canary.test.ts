import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { CredentialAad, SealedCredential } from './envelope.ts';
import { openCredential, rewrapCredential, sealCredential } from './envelope.ts';
import { CredentialError } from './errors.ts';
import { createKeyring, keyringFromEnv } from './keyring.ts';

const AAD: CredentialAad = {
  credentialId: '0197c3a2-6d4e-7b1a-8c3f-5e2d9a4b7c10',
  workspaceId: '0197c3a2-6d4e-7b1a-8c3f-5e2d9a4b7c11',
  provider: 'bluesky',
};

function flip(buffer: Buffer, index: number): Buffer {
  const copy = Buffer.from(buffer);
  copy[index] = (copy[index] ?? 0) ^ 0x01;
  return copy;
}

function capture(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('expected a failure');
}

function renderings(error: unknown): string[] {
  if (!(error instanceof Error)) {
    return [String(error)];
  }
  return [
    error.message,
    error.stack ?? '',
    String(error),
    JSON.stringify(error, Object.getOwnPropertyNames(error)),
    String(error.cause ?? ''),
  ];
}

function forms(bytes: Uint8Array): string[] {
  const buffer = Buffer.from(bytes);
  return [buffer.toString('hex'), buffer.toString('base64'), buffer.toString('base64url')];
}

describe('secret canary', () => {
  it('never leaks plaintext, ciphertext or key bytes through errors', () => {
    const canary = `CANARY_CRED_${randomBytes(8).toString('hex')}`;
    const plaintext = Buffer.from(canary, 'utf8');
    const k1 = randomBytes(32);
    const k2 = randomBytes(32);
    const oneKey = createKeyring(new Map([[1, k1]]));
    const twoKeys = createKeyring(
      new Map([
        [1, k1],
        [2, k2],
      ]),
    );
    const sealed = sealCredential(oneKey, AAD, plaintext);
    const dek = (): Buffer => Buffer.from(sealed.wrappedDek);

    const badEnvKey = randomBytes(31);
    const mixedEnv = { KRONAUT_KEK_1: k1.toString('base64'), KRONAUT_KEK_1_FILE: '/dev/null' };
    const secrets = [
      canary,
      ...forms(plaintext),
      ...forms(k1),
      ...forms(k2),
      ...forms(badEnvKey),
      ...forms(sealed.ciphertext),
      ...forms(sealed.wrappedDek),
      ...forms(sealed.nonce),
    ];

    const failures: Array<() => unknown> = [
      () => openCredential(oneKey, { ...AAD, provider: 'instagram' }, sealed),
      () => openCredential(oneKey, { ...AAD, credentialId: AAD.workspaceId }, sealed),
      () => openCredential(oneKey, { ...AAD, provider: canary }, sealed),
      () => openCredential(oneKey, { ...AAD, workspaceId: canary }, sealed),
      () => sealCredential(oneKey, { ...AAD, provider: canary }, plaintext),
      () => rewrapCredential(oneKey, { ...AAD, credentialId: canary }, sealed),
      () => openCredential(oneKey, AAD, { ...sealed, ciphertext: flip(sealed.ciphertext, 0) }),
      () =>
        openCredential(oneKey, AAD, {
          ...sealed,
          ciphertext: flip(sealed.ciphertext, sealed.ciphertext.length - 1),
        }),
      () => openCredential(oneKey, AAD, { ...sealed, nonce: flip(sealed.nonce, 3) }),
      () => openCredential(oneKey, AAD, { ...sealed, wrappedDek: flip(dek(), 0) }),
      () => openCredential(oneKey, AAD, { ...sealed, wrappedDek: flip(dek(), 30) }),
      () => openCredential(oneKey, AAD, { ...sealed, wrappedDek: flip(dek(), 59) }),
      () => openCredential(oneKey, AAD, { ...sealed, ciphertext: sealed.ciphertext.subarray(1) }),
      () => openCredential(oneKey, AAD, { ...sealed, ciphertext: Buffer.alloc(0) }),
      () => openCredential(oneKey, AAD, { ...sealed, nonce: sealed.nonce.subarray(1) }),
      () => openCredential(oneKey, AAD, { ...sealed, wrappedDek: dek().subarray(1) }),
      () => openCredential(oneKey, AAD, { ...sealed, aadV: 2 }),
      () => openCredential(oneKey, AAD, { ...sealed, kekVersion: 9 }),
      () => openCredential(twoKeys, AAD, { ...sealed, kekVersion: 2 }),
      () => rewrapCredential(twoKeys, AAD, { ...sealed, wrappedDek: flip(dek(), 5) }),
      () => rewrapCredential(twoKeys, AAD, { ...sealed, kekVersion: 9 }),
      () => rewrapCredential(twoKeys, AAD, { ...sealed, aadV: 0 }),
      () => openCredential(createKeyring(new Map([[2, k2]])), AAD, sealed),
      () => oneKey.key(7),
      () => createKeyring(new Map()),
      () => createKeyring(new Map([[1, badEnvKey]])),
      () => createKeyring(new Map([[0, k1]])),
      () => keyringFromEnv({ KRONAUT_KEK_1: badEnvKey.toString('base64') }),
      () => keyringFromEnv({ KRONAUT_KEK_1: badEnvKey.toString('base64url') }),
      () => keyringFromEnv({ KRONAUT_KEK_1: badEnvKey.toString('hex') }),
      () => keyringFromEnv({ KRONAUT_KEK_01: k1.toString('base64') }),
      () => keyringFromEnv(mixedEnv, () => k1.toString('base64')),
      () =>
        keyringFromEnv({ KRONAUT_KEK_1_FILE: '/run/secrets/kek' }, () =>
          badEnvKey.toString('base64'),
        ),
      () =>
        keyringFromEnv({ KRONAUT_KEK_1_FILE: '/run/secrets/kek' }, () => {
          throw new Error(`cannot read ${k1.toString('base64')}`);
        }),
      () => keyringFromEnv({}),
    ];

    for (const run of failures) {
      const error = capture(run);
      expect(error).toBeInstanceOf(CredentialError);
      expect((error as CredentialError).cause).toBeUndefined();
      for (const text of renderings(error)) {
        for (const secret of secrets) {
          expect(text.includes(secret)).toBe(false);
        }
      }
    }
  });

  it('reports the same message for every decrypt failure', () => {
    const keyring = createKeyring(new Map([[1, randomBytes(32)]]));
    const sealed: SealedCredential = sealCredential(keyring, AAD, Buffer.from('x'));
    const messages = new Set<string>();
    for (const tampered of [
      { ...sealed, ciphertext: flip(sealed.ciphertext, 0) },
      { ...sealed, nonce: flip(sealed.nonce, 0) },
      { ...sealed, wrappedDek: flip(sealed.wrappedDek, 0) },
      { ...sealed, wrappedDek: flip(sealed.wrappedDek, 40) },
      { ...sealed, ciphertext: Buffer.alloc(3) },
      { ...sealed, nonce: Buffer.alloc(3) },
      { ...sealed, wrappedDek: Buffer.alloc(3) },
    ]) {
      const error = capture(() => openCredential(keyring, AAD, tampered));
      messages.add((error as CredentialError).message);
    }
    expect(messages.size).toBe(1);
  });
});
