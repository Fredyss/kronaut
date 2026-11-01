import type { Actor, Database, TenantDb } from '@kronaut/db';
import type { Logger } from 'pino';
import type { MediaJob } from '../jobs.ts';
import { markImportDone } from './import-store.ts';
import { internalId } from './routes.ts';
import type { Staging } from './staging.ts';
import { completeUpload, createVideoUpload } from './upload.ts';

const SYSTEM: Actor = { kind: 'system' };

export interface ImportVideoDeps {
  readonly db: Database;
  readonly staging: Staging;
  readonly logger: Logger;
}

export interface ImportedVideo {
  readonly actor: Actor;
  readonly aiGenerated: boolean;
  readonly mime: string;
  readonly headBytes: number;
  readonly parts: AsyncIterable<Uint8Array>;
}

interface OpenedUpload {
  readonly mediaId: string;
  readonly key: string;
}

async function openUpload(trx: TenantDb, job: MediaJob, video: ImportedVideo) {
  const { media } = await createVideoUpload(trx, job.workspaceId, {
    bytes: video.headBytes,
    mime: video.mime,
    aiGenerated: video.aiGenerated,
  });
  const mediaId = internalId('media', media.id);
  const { storage_key: key } = await trx
    .selectFrom('media_assets')
    .select('storage_key')
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', mediaId)
    .executeTakeFirstOrThrow();
  return { mediaId, key };
}

async function stageParts(
  staging: Staging,
  key: string,
  parts: AsyncIterable<Uint8Array>,
): Promise<number> {
  let total = 0;
  let part = 0;
  for await (const bytes of parts) {
    part++;
    total += bytes.byteLength;
    const temp = await staging.receive(bytes);
    try {
      await staging.place(temp, key, part);
    } catch (error) {
      await staging.discard(temp);
      throw error;
    }
  }
  return total;
}

async function finishUpload(
  trx: TenantDb,
  staging: Staging,
  job: MediaJob,
  { mediaId, total }: { readonly mediaId: string; readonly total: number },
): Promise<void> {
  await trx
    .updateTable('media_assets')
    .set({ bytes: total })
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', mediaId)
    .where('state', '=', 'uploading')
    .execute();
  await completeUpload(trx, staging, { workspaceId: job.workspaceId, mediaId });
  await markImportDone(trx, job, mediaId);
}

async function abandonUpload(deps: ImportVideoDeps, job: MediaJob, upload: OpenedUpload) {
  const removed = await deps.db.withTenant(job.workspaceId, SYSTEM, (trx) =>
    trx
      .deleteFrom('media_assets')
      .where('workspace_id', '=', job.workspaceId)
      .where('id', '=', upload.mediaId)
      .where('state', '=', 'uploading')
      .executeTakeFirst(),
  );
  if (removed.numDeletedRows > 0n) await deps.staging.remove(upload.key);
}

export async function importVideo(
  deps: ImportVideoDeps,
  job: MediaJob,
  video: ImportedVideo,
): Promise<void> {
  const { db, staging, logger } = deps;
  const upload = await db.withTenant(job.workspaceId, video.actor, (trx) =>
    openUpload(trx, job, video),
  );
  try {
    const total = await stageParts(staging, upload.key, video.parts);
    await db.withTenant(job.workspaceId, video.actor, (trx) =>
      finishUpload(trx, staging, job, { mediaId: upload.mediaId, total }),
    );
  } catch (error) {
    await abandonUpload(deps, job, upload).catch(() => {
      logger.warn({ importId: job.id, workspaceId: job.workspaceId }, 'import cleanup failed');
    });
    throw error;
  }
}
