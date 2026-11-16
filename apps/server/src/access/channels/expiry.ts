import type { RefreshKind } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import type { ProviderEntry } from '../../base/providers/providers.ts';

interface CredentialExpiry {
  readonly kind: string;
  readonly access_expires_at: Date | null;
  readonly refresh_expires_at: Date | null;
}

const LIMITED_BY: Readonly<Record<RefreshKind, 'access_expires_at' | 'refresh_expires_at'>> = {
  none: 'access_expires_at',
  self_refresh: 'access_expires_at',
  reusable: 'refresh_expires_at',
  rotating: 'refresh_expires_at',
  single_use: 'refresh_expires_at',
};

export async function loadCredentialExpiries(
  trx: TenantDb,
  workspaceId: string,
  accountIds: readonly string[],
): Promise<ReadonlyMap<string, readonly CredentialExpiry[]>> {
  if (accountIds.length === 0) return new Map();
  const rows = await trx
    .selectFrom('account_credentials')
    .select(['social_account_id', 'kind', 'access_expires_at', 'refresh_expires_at'])
    .where('workspace_id', '=', workspaceId)
    .where('social_account_id', 'in', accountIds)
    .execute();
  return Map.groupBy(rows, (row) => row.social_account_id);
}

export function shownExpiry(
  entry: ProviderEntry | undefined,
  credentials: readonly CredentialExpiry[] = [],
): string | null {
  if (entry === undefined) return null;
  const { kind, refresh } = entry.manifest.auth;
  const credential = credentials.find((candidate) => candidate.kind === kind);
  return credential?.[LIMITED_BY[refresh]]?.toISOString() ?? null;
}
