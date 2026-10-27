import { randomBytes } from 'node:crypto';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { RequestContext } from '../http/types.ts';
import { enqueueMediaProcess } from '../jobs.ts';
import { MEDIA_ASSET_COLUMNS, type MediaAssetDto, toMediaAssetDto } from './dto.ts';
import { MediaError } from './errors.ts';
import { originalName } from './ingest.ts';
import type { Staging } from './staging.ts';

export const VIDEO_MAX_BYTES = 300 * 1000 * 1000;
export const VIDEO_PART_SIZE = 8 * 1024 * 1024;
export const UPLOAD_TTL_HOURS = 24;
export const VIDEO_MIMES: readonly string[] = ['video/mp4', 'video/quicktime', 'video/webm'];

export interface VideoUploadInput {
  readonly bytes: number;
  readonly mime: string;
  readonly filename?: string | undefined;
  readonly aiGenerated?: boolean | undefined;
}

export interface VideoUpload {
  readonly media: MediaAssetDto;
  readonly partSize: number;
  readonly partCount: number;
  readonly expiresAt: string;
}

export interface UploadTarget {
  readonly workspaceId: string;
  readonly mediaId: string;
}

export function partCount(bytes: number): number {
  return Math.ceil(bytes / VIDEO_PART_SIZE);
}

function expectedPartSize(bytes: number, part: number): number {
  return part < partCount(bytes)
    ? VIDEO_PART_SIZE
    : bytes - (partCount(bytes) - 1) * VIDEO_PART_SIZE;
}

function uploadClosed(): MediaError {
  return new MediaError('conflict', 'upload is closed', {
    details: [{ path: 'params.mediaId', code: 'upload_closed' }],
  });
}

export function checkVideoUpload(input: VideoUploadInput): string | null {
  if (input.bytes > VIDEO_MAX_BYTES) {
    throw new MediaError('payload_too_large', 'video exceeds 300 MB', {
      details: [{ path: 'body.bytes', code: 'file_too_large' }],
    });
  }
  if (!VIDEO_MIMES.includes(input.mime)) {
    throw new MediaError('unsupported_media_type', 'only MP4, QuickTime and WebM are accepted', {
      details: [{ path: 'body.mime', code: 'mime_unsupported' }],
    });
  }
  return originalName(input.filename);
}

export async function createVideoUpload(
  trx: TenantDb,
  workspaceId: string,
  input: VideoUploadInput,
): Promise<VideoUpload> {
  const name = checkVideoUpload(input);
  const row = await trx
    .insertInto('media_assets')
    .values({
      workspace_id: workspaceId,
      kind: 'video',
      state: 'uploading',
      storage_key: randomBytes(32).toString('hex'),
      bytes: input.bytes,
      original_name: name,
      ai_generated: input.aiGenerated ?? false,
      upload_expires_at: sql<Date>`now() + make_interval(hours => ${UPLOAD_TTL_HOURS})`,
      uploaded_by_user_id: sql<string | null>`app_actor_id('user')`,
      uploaded_by_grant_id: sql<string | null>`app_actor_id('grant')`,
    })
    .returning([...MEDIA_ASSET_COLUMNS, 'upload_expires_at'])
    .executeTakeFirstOrThrow();
  if (row.upload_expires_at === null) throw new Error('upload expiry was not set');
  return {
    media: toMediaAssetDto(row),
    partSize: VIDEO_PART_SIZE,
    partCount: partCount(input.bytes),
    expiresAt: row.upload_expires_at.toISOString(),
  };
}

async function lockUpload(trx: TenantDb, { workspaceId, mediaId }: UploadTarget) {
  const row = await trx
    .selectFrom('media_assets')
    .select([
      ...MEDIA_ASSET_COLUMNS,
      'storage_key',
      'deleted_at',
      sql<boolean>`coalesce(upload_expires_at > now(), false)`.as('open'),
    ])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', mediaId)
    .forUpdate()
    .executeTakeFirst();
  if (row === undefined) throw new MediaError('not_found', 'media asset not found');
  if (row.deleted_at !== null || row.kind !== 'video') throw uploadClosed();
  return { ...row, declared: Number(row.bytes) };
}

function checkPart(declared: number, part: number, size: number): void {
  if (part < 1 || part > partCount(declared)) {
    throw new MediaError('invalid_request', 'part is out of range', {
      details: [{ path: 'params.part', code: 'part_size' }],
    });
  }
  if (size !== expectedPartSize(declared, part)) {
    throw new MediaError('invalid_request', 'part has the wrong size', {
      details: [{ path: 'body', code: 'part_size' }],
    });
  }
}

export async function receivePart(
  ctx: Pick<RequestContext, 'tenant'>,
  staging: Staging,
  target: UploadTarget & { readonly part: number },
  body: Uint8Array,
): Promise<void> {
  const temp = await staging.receive(body);
  try {
    await ctx.tenant(async (trx) => {
      const row = await lockUpload(trx, target);
      if (row.state !== 'uploading' || !row.open) throw uploadClosed();
      checkPart(row.declared, target.part, body.byteLength);
      await staging.place(temp, row.storage_key, target.part);
    });
  } catch (error) {
    await staging.discard(temp);
    throw error;
  }
}

async function assertComplete(staging: Staging, key: string, declared: number): Promise<void> {
  const parts = await staging.parts(key);
  let total = 0;
  let missing = false;
  for (let part = 1; part <= partCount(declared); part++) {
    const size = parts.get(part);
    if (size !== expectedPartSize(declared, part)) missing = true;
    total += size ?? 0;
  }
  if (missing || total !== declared) {
    throw new MediaError('conflict', 'upload is incomplete', {
      details: [{ path: 'params.mediaId', code: 'upload_incomplete' }],
    });
  }
}

export async function completeUpload(
  trx: TenantDb,
  staging: Staging,
  target: UploadTarget,
): Promise<MediaAssetDto> {
  const row = await lockUpload(trx, target);
  if (row.state !== 'uploading') return toMediaAssetDto(row);
  if (!row.open) throw uploadClosed();
  await assertComplete(staging, row.storage_key, row.declared);
  const updated = await trx
    .updateTable('media_assets')
    .set({ state: 'processing', upload_expires_at: null, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', target.workspaceId)
    .where('id', '=', target.mediaId)
    .returning(MEDIA_ASSET_COLUMNS)
    .executeTakeFirstOrThrow();
  await enqueueMediaProcess(trx, { workspaceId: target.workspaceId, id: target.mediaId });
  return toMediaAssetDto(updated);
}
