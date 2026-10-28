import { createHash } from 'node:crypto';
import type { Actor, Database, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { MediaJob } from '../jobs.ts';
import { lockStorageKeys } from './key-lock.ts';

export type RejectedReason =
  | 'video_stream_missing'
  | 'video_too_short'
  | 'video_too_long'
  | 'video_unreadable'
  | 'video_too_large';

export interface ProcessedVideo {
  readonly key: string;
  readonly sha256: Buffer;
  readonly sourceSha256: Buffer;
  readonly bytes: number;
  readonly width: number;
  readonly height: number;
  readonly durationMs: number;
  readonly frameRateMilli: number | null;
  readonly poster: { readonly key: string; readonly sha256: Buffer; readonly bytes: number };
}

const SYSTEM: Actor = { kind: 'system' };
export const POSTER_TRANSFORM = createHash('sha256').update('poster:thumb_768:v1').digest();

function lockProcessing(trx: TenantDb, job: MediaJob) {
  return trx
    .selectFrom('media_assets')
    .select(['ai_generated', 'ai_locked', 'deleted_at'])
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', job.id)
    .where('state', '=', 'processing')
    .forUpdate()
    .executeTakeFirst();
}

async function keepDuplicate(
  trx: TenantDb,
  job: MediaJob,
  key: string,
  incoming: { readonly ai_generated: boolean; readonly ai_locked: boolean },
): Promise<boolean> {
  const existing = await trx
    .selectFrom('media_assets')
    .select(['id', 'ai_generated', 'ai_locked'])
    .where('workspace_id', '=', job.workspaceId)
    .where('storage_key', '=', key)
    .where('id', '<>', job.id)
    .forUpdate()
    .executeTakeFirst();
  if (existing === undefined) return false;
  await trx
    .updateTable('media_assets')
    .set({
      deleted_at: null,
      original_purged_at: null,
      ai_generated: existing.ai_generated || incoming.ai_generated,
      ai_locked: existing.ai_locked || incoming.ai_locked,
      updated_at: sql<Date>`now()`,
    })
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', existing.id)
    .execute();
  await trx
    .updateTable('media_assets')
    .set({
      state: 'rejected',
      rejected_reason: 'video_duplicate',
      duplicate_of_id: existing.id,
      updated_at: sql<Date>`now()`,
    })
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', job.id)
    .execute();
  return true;
}

async function markReady(trx: TenantDb, job: MediaJob, video: ProcessedVideo): Promise<void> {
  await trx
    .updateTable('media_assets')
    .set({
      state: 'ready',
      storage_key: video.key,
      sha256: video.sha256,
      source_sha256: video.sourceSha256,
      mime: 'video/mp4',
      bytes: video.bytes,
      width: video.width,
      height: video.height,
      duration_ms: video.durationMs,
      frame_rate_milli: video.frameRateMilli,
      updated_at: sql<Date>`now()`,
    })
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', job.id)
    .execute();
  await trx
    .insertInto('media_renditions')
    .values({
      workspace_id: job.workspaceId,
      media_asset_id: job.id,
      purpose: 'thumb_768',
      transform_hash: POSTER_TRANSFORM,
      storage_key: video.poster.key,
      sha256: video.poster.sha256,
      mime: 'image/webp',
      bytes: video.poster.bytes,
    })
    .onConflict((oc) => oc.doNothing())
    .execute();
}

export function finishMedia(
  db: Database,
  job: MediaJob,
  video: ProcessedVideo,
  persist: () => Promise<void>,
): Promise<'ready' | 'duplicate' | 'skipped'> {
  return db.withTenant(job.workspaceId, SYSTEM, async (trx) => {
    // The media GC takes the same lock before it removes an object under one of these keys.
    await lockStorageKeys(trx, [video.key, video.poster.key]);
    const row = await lockProcessing(trx, job);
    if (row === undefined || row.deleted_at !== null) return 'skipped';
    await persist();
    if (await keepDuplicate(trx, job, video.key, row)) return 'duplicate';
    await markReady(trx, job, video);
    return 'ready';
  });
}

export async function rejectMedia(
  db: Database,
  job: MediaJob,
  reason: RejectedReason,
): Promise<void> {
  await db.withTenant(job.workspaceId, SYSTEM, async (trx) => {
    if ((await lockProcessing(trx, job)) === undefined) return;
    await trx
      .updateTable('media_assets')
      .set({ state: 'rejected', rejected_reason: reason, updated_at: sql<Date>`now()` })
      .where('workspace_id', '=', job.workspaceId)
      .where('id', '=', job.id)
      .execute();
  });
}
