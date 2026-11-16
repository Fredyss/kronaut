import type { TenantDb } from '@kronaut/db';
import { limitedByRefreshToken } from '../../base/providers/expiry.ts';
import type { ProviderEntry } from '../../base/providers/providers.ts';

interface CredentialExpiry {
  readonly kind: string;
  readonly access_expires_at: Date | null;
  readonly refresh_expires_at: Date | null;
}

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
  if (credential === undefined) return null;
  const at = limitedByRefreshToken(refresh)
    ? credential.refresh_expires_at
    : credential.access_expires_at;
  return at?.toISOString() ?? null;
}
