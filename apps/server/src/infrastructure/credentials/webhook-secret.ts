import { type Keyring, openCredential, sealCredential } from '@kronaut/credentials';

const PURPOSE = 'webhook_endpoint';
// webhook_endpoints has no aad_v column; a new AAD version needs one before it can be sealed here.
const AAD_V = 1;

export interface WebhookSecretAad {
  readonly endpointId: string;
  readonly workspaceId: string;
}

export interface WebhookSecrets {
  readonly current: string;
  readonly previous: string | null;
}

export interface SealedWebhookSecrets {
  readonly secret_ciphertext: Buffer;
  readonly secret_nonce: Buffer;
  readonly secret_wrapped_dek: Buffer;
  readonly kek_version: number;
  readonly previous_secret_ciphertext: Buffer | null;
  readonly previous_secret_nonce: Buffer | null;
  readonly previous_secret_wrapped_dek: Buffer | null;
}

interface Sealed {
  readonly ciphertext: Buffer;
  readonly nonce: Buffer;
  readonly wrappedDek: Buffer;
  readonly kekVersion: number;
}

function aadOf(aad: WebhookSecretAad) {
  return { credentialId: aad.endpointId, workspaceId: aad.workspaceId, provider: PURPOSE };
}

function seal(keyring: Keyring, aad: WebhookSecretAad, secret: string): Sealed {
  const plaintext = Buffer.from(secret, 'utf8');
  try {
    const sealed = sealCredential(keyring, aadOf(aad), plaintext);
    if (sealed.aadV !== AAD_V) throw new Error('webhook secrets support AAD version 1 only');
    return sealed;
  } finally {
    plaintext.fill(0);
  }
}

function open(keyring: Keyring, aad: WebhookSecretAad, sealed: Sealed): string {
  const plaintext = openCredential(keyring, aadOf(aad), { ...sealed, aadV: AAD_V });
  try {
    return plaintext.toString('utf8');
  } finally {
    plaintext.fill(0);
  }
}

// Both secrets share one kek_version column, so they are always sealed together under the same KEK.
export function sealWebhookSecrets(
  keyring: Keyring,
  aad: WebhookSecretAad,
  secrets: WebhookSecrets,
): SealedWebhookSecrets {
  const current = seal(keyring, aad, secrets.current);
  const previous = secrets.previous === null ? null : seal(keyring, aad, secrets.previous);
  if (previous !== null && previous.kekVersion !== current.kekVersion) {
    throw new Error('webhook secrets were sealed under different KEK versions');
  }
  return {
    secret_ciphertext: current.ciphertext,
    secret_nonce: current.nonce,
    secret_wrapped_dek: current.wrappedDek,
    kek_version: current.kekVersion,
    previous_secret_ciphertext: previous?.ciphertext ?? null,
    previous_secret_nonce: previous?.nonce ?? null,
    previous_secret_wrapped_dek: previous?.wrappedDek ?? null,
  };
}

export function openWebhookSecrets(
  keyring: Keyring,
  aad: WebhookSecretAad,
  row: SealedWebhookSecrets,
  withPrevious: boolean,
): WebhookSecrets {
  const kekVersion = row.kek_version;
  const current = open(keyring, aad, {
    ciphertext: row.secret_ciphertext,
    nonce: row.secret_nonce,
    wrappedDek: row.secret_wrapped_dek,
    kekVersion,
  });
  const { previous_secret_ciphertext: ciphertext, previous_secret_nonce: nonce } = row;
  const wrappedDek = row.previous_secret_wrapped_dek;
  if (!withPrevious || ciphertext === null || nonce === null || wrappedDek === null) {
    return { current, previous: null };
  }
  return { current, previous: open(keyring, aad, { ciphertext, nonce, wrappedDek, kekVersion }) };
}
