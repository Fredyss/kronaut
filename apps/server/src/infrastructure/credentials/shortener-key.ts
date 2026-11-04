import { type Keyring, openCredential, sealCredential } from '@kronaut/credentials';

export interface ShortenerKeyAad {
  readonly shortenerId: string;
  readonly workspaceId: string;
  readonly provider: string;
}

export interface SealedShortenerKey {
  readonly key_ciphertext: Buffer;
  readonly key_nonce: Buffer;
  readonly key_wrapped_dek: Buffer;
  readonly kek_version: number;
  readonly aad_v: number;
}

function aadOf(aad: ShortenerKeyAad) {
  return { credentialId: aad.shortenerId, workspaceId: aad.workspaceId, provider: aad.provider };
}

export function sealShortenerKey(
  keyring: Keyring,
  aad: ShortenerKeyAad,
  key: string,
): SealedShortenerKey {
  const plaintext = Buffer.from(key, 'utf8');
  try {
    const sealed = sealCredential(keyring, aadOf(aad), plaintext);
    return {
      key_ciphertext: sealed.ciphertext,
      key_nonce: sealed.nonce,
      key_wrapped_dek: sealed.wrappedDek,
      kek_version: sealed.kekVersion,
      aad_v: sealed.aadV,
    };
  } finally {
    plaintext.fill(0);
  }
}

export function openShortenerKey(
  keyring: Keyring,
  aad: ShortenerKeyAad,
  sealed: SealedShortenerKey,
): string {
  const plaintext = openCredential(keyring, aadOf(aad), {
    ciphertext: sealed.key_ciphertext,
    nonce: sealed.key_nonce,
    wrappedDek: sealed.key_wrapped_dek,
    kekVersion: sealed.kek_version,
    aadV: sealed.aad_v,
  });
  try {
    return plaintext.toString('utf8');
  } finally {
    plaintext.fill(0);
  }
}
