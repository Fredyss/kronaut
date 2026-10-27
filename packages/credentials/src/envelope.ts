import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { CredentialError } from './errors.ts';
import type { Keyring } from './keyring.ts';

const ALGORITHM = 'aes-256-gcm';
const AAD_VERSION = 1;
const DEK_BYTES = 32;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const WRAPPED_DEK_BYTES = NONCE_BYTES + DEK_BYTES + TAG_BYTES;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PROVIDER = /^[a-z0-9_]{1,40}$/;

export interface CredentialAad {
  credentialId: string;
  workspaceId: string;
  provider: string;
}

export interface SealedCredential {
  ciphertext: Buffer;
  nonce: Buffer;
  wrappedDek: Buffer;
  kekVersion: number;
  aadV: number;
}

function normalizeUuid(value: unknown): string {
  if (typeof value !== 'string') {
    throw new CredentialError('invalid_aad');
  }
  const lowered = value.toLowerCase();
  if (!UUID.test(lowered)) {
    throw new CredentialError('invalid_aad');
  }
  return lowered;
}

function contentAad(aad: CredentialAad): Buffer {
  const credentialId = normalizeUuid(aad.credentialId);
  const workspaceId = normalizeUuid(aad.workspaceId);
  if (typeof aad.provider !== 'string' || !PROVIDER.test(aad.provider)) {
    throw new CredentialError('invalid_aad');
  }
  return Buffer.from(`${AAD_VERSION}|${credentialId}|${workspaceId}|${aad.provider}`, 'utf8');
}

function wrapAad(kekVersion: number, content: Buffer): Buffer {
  return Buffer.concat([Buffer.from(`kronaut-dek|${kekVersion}|`, 'utf8'), content]);
}

function assertAadVersion(aadV: number): void {
  if (aadV !== AAD_VERSION) {
    throw new CredentialError('unsupported_aad_version');
  }
}

function gcmEncrypt(key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, data: Uint8Array): Buffer {
  const cipher = createCipheriv(ALGORITHM, key, nonce, { authTagLength: TAG_BYTES });
  cipher.setAAD(aad);
  return Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);
}

function gcmDecrypt(key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, data: Uint8Array): Buffer {
  if (nonce.length !== NONCE_BYTES || data.length < TAG_BYTES) {
    throw new CredentialError('decrypt_failed');
  }
  const decipher = createDecipheriv(ALGORITHM, key, nonce, { authTagLength: TAG_BYTES });
  decipher.setAAD(aad);
  decipher.setAuthTag(data.subarray(data.length - TAG_BYTES));
  const body = decipher.update(data.subarray(0, data.length - TAG_BYTES));
  try {
    decipher.final();
  } catch (error) {
    body.fill(0);
    throw error;
  }
  return body;
}

function wrapDek(kek: Uint8Array, kekVersion: number, content: Buffer, dek: Buffer): Buffer {
  const nonce = randomBytes(NONCE_BYTES);
  return Buffer.concat([nonce, gcmEncrypt(kek, nonce, wrapAad(kekVersion, content), dek)]);
}

function unwrapDek(kek: Uint8Array, kekVersion: number, content: Buffer, wrapped: Buffer): Buffer {
  if (wrapped.length !== WRAPPED_DEK_BYTES) {
    throw new CredentialError('decrypt_failed');
  }
  const dek = gcmDecrypt(
    kek,
    wrapped.subarray(0, NONCE_BYTES),
    wrapAad(kekVersion, content),
    wrapped.subarray(NONCE_BYTES),
  );
  if (dek.length !== DEK_BYTES) {
    dek.fill(0);
    throw new CredentialError('decrypt_failed');
  }
  return dek;
}

export function sealCredential(
  keyring: Keyring,
  aad: CredentialAad,
  plaintext: Uint8Array,
): SealedCredential {
  const content = contentAad(aad);
  const kekVersion = keyring.current;
  const kek = keyring.key(kekVersion);
  try {
    const dek = randomBytes(DEK_BYTES);
    try {
      const nonce = randomBytes(NONCE_BYTES);
      return {
        ciphertext: gcmEncrypt(dek, nonce, content, plaintext),
        nonce,
        wrappedDek: wrapDek(kek, kekVersion, content, dek),
        kekVersion,
        aadV: AAD_VERSION,
      };
    } finally {
      dek.fill(0);
    }
  } finally {
    kek.fill(0);
  }
}

export function openCredential(
  keyring: Keyring,
  aad: CredentialAad,
  sealed: SealedCredential,
): Buffer {
  const content = contentAad(aad);
  assertAadVersion(sealed.aadV);
  const kek = keyring.key(sealed.kekVersion);
  try {
    const dek = unwrapDek(kek, sealed.kekVersion, content, sealed.wrappedDek);
    try {
      return gcmDecrypt(dek, sealed.nonce, content, sealed.ciphertext);
    } finally {
      dek.fill(0);
    }
  } catch {
    throw new CredentialError('decrypt_failed');
  } finally {
    kek.fill(0);
  }
}

export function rewrapCredential(
  keyring: Keyring,
  aad: CredentialAad,
  sealed: SealedCredential,
): SealedCredential {
  const content = contentAad(aad);
  assertAadVersion(sealed.aadV);
  const oldKek = keyring.key(sealed.kekVersion);
  try {
    const kekVersion = keyring.current;
    const newKek = keyring.key(kekVersion);
    try {
      const dek = unwrapDek(oldKek, sealed.kekVersion, content, sealed.wrappedDek);
      try {
        return {
          ciphertext: Buffer.from(sealed.ciphertext),
          nonce: Buffer.from(sealed.nonce),
          wrappedDek: wrapDek(newKek, kekVersion, content, dek),
          kekVersion,
          aadV: AAD_VERSION,
        };
      } finally {
        dek.fill(0);
      }
    } catch {
      throw new CredentialError('decrypt_failed');
    } finally {
      newKek.fill(0);
    }
  } finally {
    oldKek.fill(0);
  }
}
