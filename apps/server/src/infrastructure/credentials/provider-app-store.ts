import type { ClientSigningKey, Jwk, ProviderApp } from '@kronaut/core';
import {
  type CredentialAad,
  type Keyring,
  openCredential,
  type SealedCredential,
  sealCredential,
} from '@kronaut/credentials';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { loadPublishedKeys, loadSigningKeys, type SigningKeys } from './signing-keys.ts';

const NIL_WORKSPACE_ID = '00000000-0000-0000-0000-000000000000';

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

export interface SealedBotToken {
  readonly bot_token_ciphertext: Buffer;
  readonly bot_token_nonce: Buffer;
  readonly bot_token_wrapped_dek: Buffer;
  readonly bot_token_kek_version: number;
}

export type ProviderAppWhere =
  | { readonly id: string }
  | { readonly provider: string; readonly instanceHost: string };

export interface ProviderAppOptions {
  readonly publicBaseUrl: string;
  readonly keys?: SigningKeyRequest | undefined;
}

export interface WorkspaceAppRef {
  readonly id: string;
  readonly provider: string;
  readonly workspaceId: string;
}

interface AppRow {
  readonly id: string;
  readonly provider: string;
  readonly workspace_id: string | null;
  readonly client_secret_ciphertext: Buffer | null;
  readonly client_secret_nonce: Buffer | null;
  readonly client_secret_wrapped_dek: Buffer | null;
  readonly kek_version: number | null;
  readonly bot_token_ciphertext: Buffer | null;
  readonly bot_token_nonce: Buffer | null;
  readonly bot_token_wrapped_dek: Buffer | null;
  readonly bot_token_kek_version: number | null;
}

interface MutableApp {
  clientId: string;
  publicBaseUrl: string;
  clientSecret?: string;
  botToken?: string;
  signingKey?: ClientSigningKey;
  publishedKeys?: readonly Jwk[];
  instanceHost?: string;
}

function secretAad(appId: string, provider: string, workspaceId: string | null): CredentialAad {
  return { credentialId: appId, workspaceId: workspaceId ?? NIL_WORKSPACE_ID, provider };
}

function botTokenAad(appId: string, provider: string): CredentialAad {
  return { credentialId: appId, workspaceId: NIL_WORKSPACE_ID, provider: `bot_${provider}` };
}

function currentTenant() {
  return sql<string | null>`nullif(current_setting('app.workspace_id', true), '')::uuid`;
}

function sealText(keyring: Keyring, aad: CredentialAad, text: string): SealedCredential {
  const plaintext = Buffer.from(text, 'utf8');
  try {
    return sealCredential(keyring, aad, plaintext);
  } finally {
    plaintext.fill(0);
  }
}

function openText(keyring: Keyring, aad: CredentialAad, sealed: SealedCredential): string {
  const plaintext = openCredential(keyring, aad, sealed);
  try {
    return plaintext.toString('utf8');
  } finally {
    plaintext.fill(0);
  }
}

function sealedSecret(keyring: Keyring, aad: CredentialAad, secret: string): SealedAppSecret {
  const sealed = sealText(keyring, aad, secret);
  return {
    client_secret_ciphertext: sealed.ciphertext,
    client_secret_nonce: sealed.nonce,
    client_secret_wrapped_dek: sealed.wrappedDek,
    kek_version: sealed.kekVersion,
  };
}

export function sealAppSecret(
  keyring: Keyring,
  appId: string,
  provider: string,
  secret: string,
): SealedAppSecret {
  return sealedSecret(keyring, secretAad(appId, provider, null), secret);
}

export function sealWorkspaceAppSecret(
  keyring: Keyring,
  app: WorkspaceAppRef,
  secret: string,
): SealedAppSecret {
  return sealedSecret(keyring, secretAad(app.id, app.provider, app.workspaceId), secret);
}

export function sealBotToken(
  keyring: Keyring,
  appId: string,
  provider: string,
  token: string,
): SealedBotToken {
  const sealed = sealText(keyring, botTokenAad(appId, provider), token);
  return {
    bot_token_ciphertext: sealed.ciphertext,
    bot_token_nonce: sealed.nonce,
    bot_token_wrapped_dek: sealed.wrappedDek,
    bot_token_kek_version: sealed.kekVersion,
  };
}

function chooseSigningKey(
  keys: Exclude<SigningKeyRequest, { use: 'documents' }>,
  loaded: SigningKeys,
): ClientSigningKey | null | undefined {
  if (keys.use === 'connect') return loaded.published.length === 0 ? undefined : loaded.active;
  return keys.keyId === null ? undefined : loaded.byId(keys.keyId);
}

function openAppSecrets(keyring: Keyring, row: AppRow, app: MutableApp): void {
  if (
    row.client_secret_ciphertext !== null &&
    row.client_secret_nonce !== null &&
    row.client_secret_wrapped_dek !== null &&
    row.kek_version !== null
  ) {
    app.clientSecret = openText(keyring, secretAad(row.id, row.provider, row.workspace_id), {
      ciphertext: row.client_secret_ciphertext,
      nonce: row.client_secret_nonce,
      wrappedDek: row.client_secret_wrapped_dek,
      kekVersion: row.kek_version,
      aadV: 1,
    });
  }
  if (
    row.bot_token_ciphertext !== null &&
    row.bot_token_nonce !== null &&
    row.bot_token_wrapped_dek !== null &&
    row.bot_token_kek_version !== null
  ) {
    app.botToken = openText(keyring, botTokenAad(row.id, row.provider), {
      ciphertext: row.bot_token_ciphertext,
      nonce: row.bot_token_nonce,
      wrappedDek: row.bot_token_wrapped_dek,
      kekVersion: row.bot_token_kek_version,
      aadV: 1,
    });
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
      'workspace_id',
      'instance_host',
      'status',
      'client_id',
      'client_secret_ciphertext',
      'client_secret_nonce',
      'client_secret_wrapped_dek',
      'kek_version',
      'bot_token_ciphertext',
      'bot_token_nonce',
      'bot_token_wrapped_dek',
      'bot_token_kek_version',
    ])
    .where((eb) =>
      eb.or([eb('workspace_id', 'is', null), eb('workspace_id', '=', currentTenant())]),
    );
  query =
    'id' in where
      ? query.where('id', '=', where.id)
      : query
          .where('workspace_id', 'is', null)
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
  openAppSecrets(keyring, row, app);
  const signingKeyMissing = await attachKeys(db, keyring, row.id, { keys: options.keys, app });
  return {
    id: row.id,
    provider: row.provider,
    status: row.status,
    app,
    signingKeyMissing,
  };
}
