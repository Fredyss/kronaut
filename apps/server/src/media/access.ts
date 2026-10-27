import type { Database } from '@kronaut/db';
import { MEDIA_URL_MAX_TTL_SECONDS, type MediaStore, signMediaPath } from '@kronaut/media';
import type { Temporal } from 'temporal-polyfill';
import type { MediaAccess } from '../media-access.ts';

export interface MediaAccessDeps {
  readonly db: Database;
  readonly store: MediaStore;
  readonly signingKey: Uint8Array;
  readonly mediaBaseUrl: URL;
  readonly clock: () => Temporal.Instant;
}

export function createMediaAccess(deps: MediaAccessDeps): MediaAccess {
  const origin = deps.mediaBaseUrl.origin;

  async function readyKey(workspaceId: string, assetId: string): Promise<string> {
    const row = await deps.db.withTenant(workspaceId, { kind: 'system' }, (trx) =>
      trx
        .selectFrom('media_assets')
        .select(['storage_key', 'state', 'original_purged_at'])
        .where('workspace_id', '=', workspaceId)
        .where('id', '=', assetId)
        .executeTakeFirst(),
    );
    if (row === undefined) throw new Error('media asset not found');
    if (row.state !== 'ready' || row.original_purged_at !== null) {
      throw new Error('media asset is not available');
    }
    return row.storage_key;
  }

  return {
    async signedUrl(workspaceId, assetId, ttlSeconds) {
      if (
        !Number.isSafeInteger(ttlSeconds) ||
        ttlSeconds < 1 ||
        ttlSeconds > MEDIA_URL_MAX_TTL_SECONDS
      ) {
        throw new RangeError(
          `ttlSeconds must be an integer from 1 to ${MEDIA_URL_MAX_TTL_SECONDS}`,
        );
      }
      const key = await readyKey(workspaceId, assetId);
      const nowSeconds = Math.floor(deps.clock().epochMilliseconds / 1000);
      return `${origin}${signMediaPath(deps.signingKey, key, nowSeconds + ttlSeconds)}`;
    },

    async read(workspaceId, assetId) {
      const key = await readyKey(workspaceId, assetId);
      const opened = await deps.store.open(key);
      if (opened === null) throw new Error('media object is missing');
      const chunks: Buffer[] = [];
      for await (const chunk of opened.stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const bytes = Buffer.concat(chunks);
      if (bytes.byteLength !== opened.size) throw new Error('media object changed while reading');
      return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    },
  };
}
