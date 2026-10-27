import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';

export const MediaAssetSchema = z.object({
  id: z.string().regex(/^media_[0-9a-hjkmnp-tv-z]{26}$/),
  kind: z.enum(['image', 'video']),
  mime: z.string().nullable(),
  bytes: z.number().int().nonnegative().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .nullable(),
  state: z.enum(['uploading', 'quarantined', 'processing', 'ready', 'rejected']),
  aiGenerated: z.boolean(),
});

export type MediaAssetDto = z.output<typeof MediaAssetSchema>;

export const MEDIA_ASSET_COLUMNS = [
  'id',
  'kind',
  'mime',
  'bytes',
  'width',
  'height',
  'sha256',
  'state',
  'ai_generated',
] as const;

export interface MediaAssetRow {
  readonly id: string;
  readonly kind: string;
  readonly mime: string | null;
  readonly bytes: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly sha256: Buffer | null;
  readonly state: string;
  readonly ai_generated: boolean;
}

export function toMediaAssetDto(row: MediaAssetRow): MediaAssetDto {
  return MediaAssetSchema.parse({
    id: encodePublicId('media', row.id),
    kind: row.kind,
    mime: row.mime,
    bytes: row.bytes === null ? null : Number(row.bytes),
    width: row.width,
    height: row.height,
    sha256: row.sha256 === null ? null : row.sha256.toString('hex'),
    state: row.state,
    aiGenerated: row.ai_generated,
  });
}

export async function findMediaAsset(
  trx: TenantDb,
  workspaceId: string,
  mediaId: string,
): Promise<MediaAssetDto | null> {
  const row = await trx
    .selectFrom('media_assets')
    .select(MEDIA_ASSET_COLUMNS)
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', mediaId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
  return row === undefined ? null : toMediaAssetDto(row);
}
