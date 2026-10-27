import type { ClientSigningKey, Jwk, ProviderApp } from '@kronaut/core';
import { type Keyring, openCredential, sealCredential } from '@kronaut/credentials';
import type { TenantDb } from '@kronaut/db';
import { loadPublishedKeys, loadSigningKeys, type SigningKeys } from './signing-keys.ts';

export const NIL_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

export interface StoredProviderApp {
  readonly id: string;
  readonly provider: string;
  readonly status: string;
  readonly app: ProviderApp;
  readonly signingKeyMissing: boolean;
}

export type SigningKeyRequest =
  | { readonly use: 'connect' }
  | { readonly use: 'bound'; readonly keyId: string | null }
  | { readonly use: 'documents' };

export interface SealedAppSecret {
  readonly client_secret_ciphertext: Buffer;
  readonly client_secret_nonce: Buffer;
  readonly client_secret_wrapped_dek: Buffer;
  readonly kek_version: number;
}

export type ProviderAppWhere =
  | { readonly id: string }
  | { readonly provider: string; readonly instanceHost: string };

export interface ProviderAppOptions {
  readonly publicBaseUrl: string;
  readonly keys?: SigningKeyRequest | undefined;
}

interface AppRow {
  readonly id: string;
  readonly provider: string;
  readonly client_secret_ciphertext: Buffer | null;
  readonly client_secret_nonce: Buffer | null;
  readonly client_secret_wrapped_dek: Buffer | null;
  readonly kek_version: number | null;
}

interface MutableApp {
  clientId: string;
  publicBaseUrl: string;
  clientSecret?: string;
  signingKey?: ClientSigningKey;
  publishedKeys?: readonly Jwk[];
  instanceHost?: string;
}

export function sealAppSecret(
  keyring: Keyring,
  appId: string,
  provider: string,
  secret: string,
): SealedAppSecret {
  const plaintext = Buffer.from(secret, 'utf8');
  try {
    const sealed = sealCredential(
      keyring,
      { credentialId: appId, workspaceId: NIL_WORKSPACE_ID, provider },
      plaintext,
    );
    return {
      client_secret_ciphertext: sealed.ciphertext,
      client_secret_nonce: sealed.nonce,
      client_secret_wrapped_dek: sealed.wrappedDek,
      kek_version: sealed.kekVersion,
    };
  } finally {
    plaintext.fill(0);
  }
}

function chooseSigningKey(
  keys: Exclude<SigningKeyRequest, { use: 'documents' }>,
  loaded: SigningKeys,
): ClientSigningKey | null | undefined {
  if (keys.use === 'connect') return loaded.published.length === 0 ? undefined : loaded.active;
  return keys.keyId === null ? undefined : loaded.byId(keys.keyId);
}

function openAppSecret(keyring: Keyring, row: AppRow, app: MutableApp): void {
  if (
    row.client_secret_ciphertext !== null &&
    row.client_secret_nonce !== null &&
    row.client_secret_wrapped_dek !== null &&
    row.kek_version !== null
  ) {
    const plaintext = openCredential(
      keyring,
      { credentialId: row.id, workspaceId: NIL_WORKSPACE_ID, provider: row.provider },
      {
        ciphertext: row.client_secret_ciphertext,
        nonce: row.client_secret_nonce,
        wrappedDek: row.client_secret_wrapped_dek,
        kekVersion: row.kek_version,
        aadV: 1,
      },
    );
    try {
      app.clientSecret = plaintext.toString('utf8');
    } finally {
      plaintext.fill(0);
    }
  }
}

async function attachKeys(
  db: TenantDb,
  keyring: Keyring,
  appId: string,
  { keys, app }: { readonly keys: SigningKeyRequest | undefined; readonly app: MutableApp },
): Promise<boolean> {
  let signingKeyMissing = false;
  if (keys?.use === 'documents') {
    const published = await loadPublishedKeys(db, appId);
    if (published.length > 0) app.publishedKeys = published;
  } else if (keys !== undefined) {
    const loaded = await loadSigningKeys(db, keyring, appId);
    if (loaded.published.length > 0) app.publishedKeys = loaded.published;
    const signingKey = chooseSigningKey(keys, loaded);
    if (signingKey === null) signingKeyMissing = true;
    else if (signingKey !== undefined) app.signingKey = signingKey;
  }
  return signingKeyMissing;
}

export async function loadProviderApp(
  db: TenantDb,
  keyring: Keyring,
  where: ProviderAppWhere,
  options: ProviderAppOptions,
): Promise<StoredProviderApp | null> {
  let query = db
    .selectFrom('provider_apps')
    .select([
      'id',
      'provider',
      'instance_host',
      'status',
      'client_id',
      'client_secret_ciphertext',
      'client_secret_nonce',
      'client_secret_wrapped_dek',
      'kek_version',
    ]);
  query =
    'id' in where
      ? query.where('id', '=', where.id)
      : query
          .where('provider', '=', where.provider)
          .where('instance_host', '=', where.instanceHost)
          .where('status', '<>', 'disabled')
          .orderBy('created_at', 'desc')
          .limit(1);
  const row = await query.executeTakeFirst();
  if (row === undefined) return null;

  const app: MutableApp = {
    clientId: row.client_id,
    publicBaseUrl: options.publicBaseUrl,
    ...(row.instance_host === '' ? {} : { instanceHost: row.instance_host }),
  };
  openAppSecret(keyring, row, app);
  const signingKeyMissing = await attachKeys(db, keyring, row.id, { keys: options.keys, app });
  return { id: row.id, provider: row.provider, status: row.status, app, signingKeyMissing };
}
