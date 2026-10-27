import { createHash } from 'node:crypto';
import type { TenantDb } from '@kronaut/db';
import { type MediaStore, ReencodeError, reencodeImage, storageKey } from '@kronaut/media';
import { sql } from 'kysely';
import { MEDIA_ASSET_COLUMNS, type MediaAssetDto, toMediaAssetDto } from './dto.ts';
import { MediaError } from './errors.ts';
import { type ImageFormat, type SniffedImage, sniffImage } from './sniff.ts';

export const MEDIA_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const ORIGINAL_NAME_MAX = 255;

export interface PrepareImageInput {
  readonly bytes: Uint8Array;
  readonly filename?: string;
}

export interface PreparedImage {
  readonly master: Uint8Array;
  readonly image: SniffedImage;
  readonly sha256: Buffer;
  readonly sourceSha256: Buffer;
  readonly originalName: string | null;
}

function sha256(bytes: Uint8Array): Buffer {
  return createHash('sha256').update(bytes).digest();
}

function originalName(filename: string | undefined): string | null {
  if (filename === undefined) return null;
  const name = filename.normalize('NFC');
  if (name === '' || [...name].length > ORIGINAL_NAME_MAX) {
    throw new MediaError('invalid_request', 'filename must be 1 to 255 characters');
  }
  if (/\p{Cc}/u.test(name)) {
    throw new MediaError('invalid_request', 'filename must not contain control characters');
  }
  return name;
}

async function reencode(bytes: Uint8Array, format: ImageFormat): Promise<Uint8Array> {
  try {
    return (await reencodeImage(bytes, format)).bytes;
  } catch (error) {
    if (!(error instanceof ReencodeError)) throw error;
    throw error.kind === 'too_many_pixels'
      ? new MediaError('invalid_request', 'image exceeds 50 megapixels')
      : new MediaError('invalid_request', 'image is corrupt or truncated');
  }
}

function sniffMaster(master: Uint8Array, format: ImageFormat): SniffedImage {
  const sniffed = sniffImage(master);
  if (!sniffed.ok || sniffed.image.format !== format) {
    throw new Error(`re-encoded master is not a valid ${format} file`);
  }
  return sniffed.image;
}

export async function prepareImage(input: PrepareImageInput): Promise<PreparedImage> {
  if (input.bytes.byteLength > MEDIA_IMAGE_MAX_BYTES) {
    throw new MediaError('payload_too_large', 'image exceeds 8 MiB');
  }
  const name = originalName(input.filename);
  const sniffed = sniffImage(input.bytes);
  if (!sniffed.ok) {
    throw sniffed.reason === 'unsupported'
      ? new MediaError('unsupported_media_type', 'only JPEG, PNG and WebP images are accepted')
      : new MediaError('invalid_request', 'image is corrupt or truncated');
  }
  const master = await reencode(input.bytes, sniffed.image.format);
  return {
    master,
    image: sniffMaster(master, sniffed.image.format),
    sha256: sha256(master),
    sourceSha256: sha256(input.bytes),
    originalName: name,
  };
}

export interface IngestTarget {
  readonly workspaceId: string;
  readonly aiGenerated: boolean;
}

export async function ingestImage(
  trx: TenantDb,
  store: MediaStore,
  { workspaceId, aiGenerated }: IngestTarget,
  prepared: PreparedImage,
): Promise<MediaAssetDto> {
  const { master, image, sha256: digest } = prepared;
  const key = storageKey(workspaceId, digest);

  const stored = await store.put(key, master);
  if (!stored.sha256.equals(digest) || stored.bytes !== master.byteLength) {
    throw new Error('media store wrote different bytes');
  }

  const inserted = await trx
    .insertInto('media_assets')
    .values({
      workspace_id: workspaceId,
      kind: 'image',
      state: 'ready',
      storage_key: key,
      source_sha256: prepared.sourceSha256,
      sha256: digest,
      mime: image.mime,
      bytes: master.byteLength,
      width: image.width,
      height: image.height,
      original_name: prepared.originalName,
      ai_generated: aiGenerated,
      uploaded_by_user_id: sql<string | null>`app_actor_id('user')`,
      uploaded_by_grant_id: sql<string | null>`app_actor_id('grant')`,
    })
    .onConflict((oc) => oc.column('storage_key').doNothing())
    .returning(MEDIA_ASSET_COLUMNS)
    .executeTakeFirst();
  if (inserted !== undefined) return toMediaAssetDto(inserted);

  const existing = await trx
    .selectFrom('media_assets')
    .select([...MEDIA_ASSET_COLUMNS, 'deleted_at'])
    .where('workspace_id', '=', workspaceId)
    .where('storage_key', '=', key)
    .forUpdate()
    .executeTakeFirstOrThrow();
  if (existing.deleted_at === null && (existing.ai_generated || !aiGenerated)) {
    return toMediaAssetDto(existing);
  }
  const restored = await trx
    .updateTable('media_assets')
    .set({
      deleted_at: null,
      original_purged_at: null,
      ai_generated: existing.ai_generated || aiGenerated,
      updated_at: sql<Date>`now()`,
    })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', existing.id)
    .returning(MEDIA_ASSET_COLUMNS)
    .executeTakeFirstOrThrow();
  return toMediaAssetDto(restored);
}
