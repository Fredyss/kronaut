import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';

export const REJECTED_REASONS = [
  'video_stream_missing',
  'video_too_short',
  'video_too_long',
  'video_unreadable',
  'video_too_large',
  'video_duplicate',
] as const;

const MEDIA_ID = /^media_[0-9a-hjkmnp-tv-z]{26}$/;

export const MediaAssetSchema = z.object({
  id: z.string().regex(MEDIA_ID),
  kind: z.enum(['image', 'video']),
  mime: z.string().nullable(),
  bytes: z.number().int().nonnegative().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  frameRate: z.number().positive().nullable(),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .nullable(),
  state: z.enum(['uploading', 'quarantined', 'processing', 'ready', 'rejected']),
  aiGenerated: z.boolean(),
  rejectedReason: z.enum(REJECTED_REASONS).nullable(),
  duplicateOf: z.string().regex(MEDIA_ID).nullable(),
});

export type MediaAssetDto = z.output<typeof MediaAssetSchema>;

export const MEDIA_ASSET_COLUMNS = [
  'id',
  'kind',
  'mime',
  'bytes',
  'width',
  'height',
  'duration_ms',
  'frame_rate_milli',
  'sha256',
  'state',
  'ai_generated',
  'rejected_reason',
  'duplicate_of_id',
] as const;

export interface MediaAssetRow {
  readonly id: string;
  readonly kind: string;
  readonly mime: string | null;
  readonly bytes: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly duration_ms: number | null;
  readonly frame_rate_milli: number | null;
  readonly sha256: Buffer | null;
  readonly state: string;
  readonly ai_generated: boolean;
  readonly rejected_reason: string | null;
  readonly duplicate_of_id: string | null;
}

export function toMediaAssetDto(row: MediaAssetRow): MediaAssetDto {
  return MediaAssetSchema.parse({
    id: encodePublicId('media', row.id),
    kind: row.kind,
    mime: row.mime,
    bytes: row.bytes === null ? null : Number(row.bytes),
    width: row.width,
    height: row.height,
    durationMs: row.duration_ms,
    frameRate: row.frame_rate_milli === null ? null : row.frame_rate_milli / 1000,
    sha256: row.sha256 === null ? null : row.sha256.toString('hex'),
    state: row.state,
    aiGenerated: row.ai_generated,
    rejectedReason: row.rejected_reason,
    duplicateOf: row.duplicate_of_id === null ? null : encodePublicId('media', row.duplicate_of_id),
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
