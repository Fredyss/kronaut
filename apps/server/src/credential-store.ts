import { randomUUID } from 'node:crypto';
import type { CredentialKind } from '@kronaut/core';
import type { Keyring } from '@kronaut/credentials';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { openValue, sealValue, toDate } from './credential-seal.ts';

export {
  loadProviderApp,
  NIL_WORKSPACE_ID,
  type ProviderAppOptions,
  type ProviderAppWhere,
  type SealedAppSecret,
  type SigningKeyRequest,
  type StoredProviderApp,
  sealAppSecret,
} from './provider-app-store.ts';

export interface CredentialWrite {
  readonly workspaceId: string;
  readonly socialAccountId: string;
  readonly kind: CredentialKind;
  readonly value: unknown;
  readonly grantedScopes: readonly string[];
  readonly accessExpiresAt?: Temporal.Instant | undefined;
  readonly refreshExpiresAt?: Temporal.Instant | undefined;
  readonly clientKeyId?: string | null | undefined;
}

export interface StoredCredential {
  readonly id: string;
  readonly version: number;
  readonly provider: string;
  readonly value: unknown;
  readonly grantedScopes: readonly string[];
  readonly accessExpiresAt: Date | null;
  readonly refreshExpiresAt: Date | null;
}

export async function saveCredential(
  db: TenantDb,
  keyring: Keyring,
  input: CredentialWrite,
): Promise<{ id: string; version: number }> {
  const account = await db
    .selectFrom('social_accounts')
    .select('provider')
    .where('workspace_id', '=', input.workspaceId)
    .where('id', '=', input.socialAccountId)
    .executeTakeFirst();
  if (account === undefined) throw new Error('social account not found');

  const existing = await db
    .selectFrom('account_credentials')
    .select(['id', 'version'])
    .where('workspace_id', '=', input.workspaceId)
    .where('social_account_id', '=', input.socialAccountId)
    .where('kind', '=', input.kind)
    .forUpdate()
    .executeTakeFirst();

  const id = existing?.id ?? randomUUID();
  const fields = {
    ...sealValue(
      keyring,
      { credentialId: id, workspaceId: input.workspaceId, provider: account.provider },
      input.value,
    ),
    granted_scopes: [...input.grantedScopes],
    access_expires_at: toDate(input.accessExpiresAt),
    refresh_expires_at: toDate(input.refreshExpiresAt),
    client_key_id: input.clientKeyId ?? null,
  };

  if (existing === undefined) {
    return await db
      .insertInto('account_credentials')
      .values({
        workspace_id: input.workspaceId,
        id,
        social_account_id: input.socialAccountId,
        kind: input.kind,
        ...fields,
      })
      .returning(['id', 'version'])
      .executeTakeFirstOrThrow();
  }
  return await db
    .updateTable('account_credentials')
    .set({ ...fields, version: existing.version + 1, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', input.workspaceId)
    .where('id', '=', existing.id)
    .where('version', '=', existing.version)
    .returning(['id', 'version'])
    .executeTakeFirstOrThrow();
}

export interface CredentialRef {
  readonly workspaceId: string;
  readonly socialAccountId: string;
  readonly kind: CredentialKind;
}

export async function loadCredential(
  db: TenantDb,
  keyring: Keyring,
  { workspaceId, socialAccountId, kind }: CredentialRef,
): Promise<StoredCredential | null> {
  const row = await db
    .selectFrom('account_credentials as c')
    .innerJoin('social_accounts as a', (join) =>
      join.onRef('a.workspace_id', '=', 'c.workspace_id').onRef('a.id', '=', 'c.social_account_id'),
    )
    .select([
      'c.id',
      'c.version',
      'c.ciphertext',
      'c.nonce',
      'c.wrapped_dek',
      'c.kek_version',
      'c.aad_v',
      'c.granted_scopes',
      'c.access_expires_at',
      'c.refresh_expires_at',
      'a.provider',
    ])
    .where('c.workspace_id', '=', workspaceId)
    .where('c.social_account_id', '=', socialAccountId)
    .where('c.kind', '=', kind)
    .executeTakeFirst();
  if (row === undefined) return null;
  return {
    id: row.id,
    version: row.version,
    provider: row.provider,
    value: openValue(keyring, workspaceId, row),
    grantedScopes: row.granted_scopes,
    accessExpiresAt: row.access_expires_at,
    refreshExpiresAt: row.refresh_expires_at,
  };
}

export interface RefreshableCredential {
  readonly id: string;
  readonly version: number;
  readonly provider: string;
  readonly socialAccountId: string;
  readonly providerAppId: string;
  readonly providerAppStatus: string;
  readonly clientKeyId: string | null;
  readonly providerAccountId: string;
  readonly handle: string | null;
  readonly value: unknown;
  readonly accessExpiresAt: Date | null;
  readonly refreshExpiresAt: Date | null;
  readonly refreshLeaseUntil: Date | null;
  readonly refreshLeaseOwner: string | null;
}

export interface CredentialIdRef {
  readonly workspaceId: string;
  readonly credentialId: string;
}

export async function loadCredentialById(
  db: TenantDb,
  keyring: Keyring,
  { workspaceId, credentialId }: CredentialIdRef,
  options: { readonly forUpdate?: boolean } = {},
): Promise<RefreshableCredential | null> {
  let query = db
    .selectFrom('account_credentials as c')
    .innerJoin('social_accounts as a', (join) =>
      join.onRef('a.workspace_id', '=', 'c.workspace_id').onRef('a.id', '=', 'c.social_account_id'),
    )
    .innerJoin('provider_apps as p', 'p.id', 'a.provider_app_id')
    .select([
      'c.id',
      'c.version',
      'c.social_account_id',
      'p.status as provider_app_status',
      'c.ciphertext',
      'c.nonce',
      'c.wrapped_dek',
      'c.kek_version',
      'c.aad_v',
      'c.access_expires_at',
      'c.refresh_expires_at',
      'c.refresh_lease_until',
      'c.refresh_lease_owner',
      'c.client_key_id',
      'a.provider',
      'a.provider_app_id',
      'a.provider_account_id',
      'a.handle',
    ])
    .where('c.workspace_id', '=', workspaceId)
    .where('c.id', '=', credentialId);
  if (options.forUpdate === true) query = query.forUpdate('c');
  const row = await query.executeTakeFirst();
  if (row === undefined) return null;
  return {
    id: row.id,
    version: row.version,
    provider: row.provider,
    socialAccountId: row.social_account_id,
    providerAppId: row.provider_app_id,
    providerAppStatus: row.provider_app_status,
    clientKeyId: row.client_key_id,
    providerAccountId: row.provider_account_id,
    handle: row.handle,
    value: openValue(keyring, workspaceId, row),
    accessExpiresAt: row.access_expires_at,
    refreshExpiresAt: row.refresh_expires_at,
    refreshLeaseUntil: row.refresh_lease_until,
    refreshLeaseOwner: row.refresh_lease_owner,
  };
}

export interface RefreshedWrite {
  readonly workspaceId: string;
  readonly credentialId: string;
  readonly provider: string;
  readonly version: number;
  readonly leaseOwner: string;
  readonly value: unknown;
  readonly grantedScopes: readonly string[];
  readonly accessExpiresAt?: Temporal.Instant | undefined;
  readonly refreshExpiresAt?: Temporal.Instant | undefined;
}

export async function persistRefreshed(
  db: TenantDb,
  keyring: Keyring,
  input: RefreshedWrite,
): Promise<number | null> {
  const row = await db
    .updateTable('account_credentials')
    .set({
      ...sealValue(
        keyring,
        {
          credentialId: input.credentialId,
          workspaceId: input.workspaceId,
          provider: input.provider,
        },
        input.value,
      ),
      granted_scopes: [...input.grantedScopes],
      access_expires_at: toDate(input.accessExpiresAt),
      refresh_expires_at: toDate(input.refreshExpiresAt),
      version: input.version + 1,
      updated_at: sql<Date>`now()`,
      refresh_lease_until: null,
      refresh_lease_owner: null,
    })
    .where('workspace_id', '=', input.workspaceId)
    .where('id', '=', input.credentialId)
    .where('version', '=', input.version)
    .where('refresh_lease_owner', '=', input.leaseOwner)
    .returning('version')
    .executeTakeFirst();
  return row?.version ?? null;
}
