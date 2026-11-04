import type { TenantDb } from '@kronaut/db';
import type { SealedShortenerKey } from '../../infrastructure/credentials/shortener-key.ts';
import type { ShortenerProvider } from './shortener.ts';

export interface StoredShortener extends SealedShortenerKey {
  readonly id: string;
  readonly provider: ShortenerProvider;
  readonly base_url: string;
  readonly domain: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}

export async function loadShortener(
  trx: TenantDb,
  workspaceId: string,
  lock = false,
): Promise<StoredShortener | null> {
  const query = trx
    .selectFrom('link_shorteners')
    .select(['id', 'provider', 'base_url', 'domain', 'created_at', 'updated_at'])
    .select(['key_ciphertext', 'key_nonce', 'key_wrapped_dek', 'kek_version', 'aad_v'])
    .where('workspace_id', '=', workspaceId);
  const row = await (lock ? query.forUpdate() : query).executeTakeFirst();
  return row === undefined ? null : { ...row, provider: row.provider as ShortenerProvider };
}

export function shortenerDto(row: StoredShortener) {
  return {
    provider: row.provider,
    baseUrl: row.base_url,
    domain: row.domain,
    hasKey: true,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
