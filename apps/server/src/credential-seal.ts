import { type Keyring, openCredential, sealCredential } from '@kronaut/credentials';
import type { Temporal } from 'temporal-polyfill';

function encode(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), 'utf8');
}

function decode(plaintext: Buffer): unknown {
  try {
    return JSON.parse(plaintext.toString('utf8'));
  } finally {
    plaintext.fill(0);
  }
}

export function toDate(instant: Temporal.Instant | undefined): Date | null {
  return instant === undefined ? null : new Date(instant.epochMilliseconds);
}

export function sealValue(
  keyring: Keyring,
  aad: { credentialId: string; workspaceId: string; provider: string },
  value: unknown,
) {
  const plaintext = encode(value);
  let sealed: ReturnType<typeof sealCredential>;
  try {
    sealed = sealCredential(keyring, aad, plaintext);
  } finally {
    plaintext.fill(0);
  }
  return {
    ciphertext: sealed.ciphertext,
    nonce: sealed.nonce,
    wrapped_dek: sealed.wrappedDek,
    kek_version: sealed.kekVersion,
    aad_v: sealed.aadV,
  };
}

interface SealedRow {
  readonly id: string;
  readonly provider: string;
  readonly ciphertext: Buffer;
  readonly nonce: Buffer;
  readonly wrapped_dek: Buffer;
  readonly kek_version: number;
  readonly aad_v: number;
}

export function openValue(keyring: Keyring, workspaceId: string, row: SealedRow): unknown {
  return decode(
    openCredential(
      keyring,
      { credentialId: row.id, workspaceId, provider: row.provider },
      {
        ciphertext: row.ciphertext,
        nonce: row.nonce,
        wrappedDek: row.wrapped_dek,
        kekVersion: row.kek_version,
        aadV: row.aad_v,
      },
    ),
  );
}
