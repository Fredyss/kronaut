import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import type { MediaSigner } from './access.ts';
import {
  MEDIA_ASSET_COLUMNS,
  type MediaAssetRow,
  MediaAssetSchema,
  toMediaAssetDto,
} from './dto.ts';
import { MediaError } from './errors.ts';
import { POSTER_TRANSFORM } from './process-finish.ts';

export const PREVIEW_TTL_SECONDS = 3600;

export const LibraryAssetSchema = MediaAssetSchema.extend({
  previewUrl: z.url().nullable(),
});

export type LibraryAssetDto = z.output<typeof LibraryAssetSchema>;

export const PREVIEW_COLUMNS = [
  ...MEDIA_ASSET_COLUMNS,
  'storage_key',
  'original_purged_at',
] as const;

export interface PreviewRow extends MediaAssetRow {
  readonly storage_key: string;
  readonly original_purged_at: Date | null;
}

async function posterKeys(trx: TenantDb, workspaceId: string, rows: readonly PreviewRow[]) {
  const videos = rows.filter((row) => row.kind === 'video').map((row) => row.id);
  if (videos.length === 0) return new Map<string, string>();
  const posters = await trx
    .selectFrom('media_renditions')
    .select(['media_asset_id', 'storage_key'])
    .where('workspace_id', '=', workspaceId)
    .where('media_asset_id', 'in', videos)
    .where('purpose', '=', 'thumb_768')
    .where('transform_hash', '=', POSTER_TRANSFORM)
    .execute();
  return new Map(posters.map((poster) => [poster.media_asset_id, poster.storage_key]));
}

function imageKey(row: PreviewRow): string | null {
  return row.state === 'ready' && row.original_purged_at === null ? row.storage_key : null;
}

export async function withPreviews(
  trx: TenantDb,
  signer: MediaSigner,
  workspaceId: string,
  rows: readonly PreviewRow[],
): Promise<LibraryAssetDto[]> {
  const posters = await posterKeys(trx, workspaceId, rows);
  return rows.map((row) => {
    const key = row.kind === 'video' ? (posters.get(row.id) ?? null) : imageKey(row);
    const previewUrl = key === null ? null : signer.sign(key, PREVIEW_TTL_SECONDS);
    return { ...toMediaAssetDto(row), previewUrl };
  });
}

export async function findLibraryAsset(
  trx: TenantDb,
  signer: MediaSigner,
  workspaceId: string,
  mediaId: string,
): Promise<LibraryAssetDto> {
  const row = await trx
    .selectFrom('media_assets')
    .select(PREVIEW_COLUMNS)
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', mediaId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
  if (row === undefined) throw new MediaError('not_found', 'media asset not found');
  const [asset] = await withPreviews(trx, signer, workspaceId, [row]);
  if (asset === undefined) throw new Error('preview lost its row');
  return asset;
}
