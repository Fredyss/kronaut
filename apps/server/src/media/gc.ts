import type { Actor, Database, TenantDb } from '@kronaut/db';
import type { MediaStore } from '@kronaut/media';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { type MediaJob, mediaJobKey } from '../jobs/jobs.ts';
import { settleExpiredImport } from './import-store.ts';
import { lockStorageKeys, removeIfUnreferenced } from './key-lock.ts';
import { referenced } from './library.ts';
import { rejectMedia } from './process-finish.ts';
import type { Staging } from './staging.ts';

export const MEDIA_GC_BATCH = 500;
export const INCOMING_MAX_AGE_MS = 3_600_000;
const SYSTEM: Actor = { kind: 'system' };

export interface MediaGcDeps {
  readonly staging: Staging;
  readonly store: MediaStore;
  readonly logger: Logger;
}

async function expireUpload(db: Database, workspaceId: string, id: string): Promise<string | null> {
  return await db.withTenant(workspaceId, SYSTEM, async (trx) => {
    const row = await trx
      .selectFrom('media_assets')
      .select('storage_key')
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', id)
      .where('state', '=', 'uploading')
      .where('created_at', '<', sql<Date>`now() - interval '24 hours'`)
      .forUpdate()
      .executeTakeFirst();
    if (row === undefined) return null;
    await trx
      .deleteFrom('media_assets')
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', id)
      .execute();
    return row.storage_key;
  });
}

// A worker killed on the job's last attempt never reaches rejectMedia, and such a video can't be
// published. A running job counts as live even on that attempt, since attempts rises at the claim.
async function lostVideoKey(db: Database, { workspaceId, id }: MediaJob): Promise<string | null> {
  return await db.withTenant(workspaceId, SYSTEM, async (trx) => {
    const row = await trx
      .selectFrom('media_assets')
      .select('storage_key')
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', id)
      .where('state', '=', 'processing')
      .where('updated_at', '<', sql<Date>`now() - interval '1 hour'`)
      .executeTakeFirst();
    if (row === undefined) return null;
    const { rows } = await sql<{ live: boolean }>`
      select exists (
        select 1 from graphile_worker.jobs
         where key = ${mediaJobKey(id)} and (attempts < max_attempts or locked_at is not null)
      ) as live
    `.execute(trx);
    return rows[0]?.live === true ? null : row.storage_key;
  });
}

async function rejectLostVideo(db: Database, staging: Staging, job: MediaJob): Promise<boolean> {
  const key = await lostVideoKey(db, job);
  if (key === null) return false;
  await rejectMedia(db, job, 'video_unreadable');
  await staging.remove(key);
  return true;
}

function expiredDeleted(trx: TenantDb, workspaceId: string, id: string) {
  return trx
    .selectFrom('media_assets')
    .select('storage_key')
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', id)
    .where('deleted_at', '<', sql<Date>`now() - interval '30 days'`);
}

async function storedKeys(trx: TenantDb, workspaceId: string, id: string) {
  const asset = await expiredDeleted(trx, workspaceId, id).executeTakeFirst();
  if (asset === undefined) return null;
  const renditions = await trx
    .selectFrom('media_renditions')
    .select('storage_key')
    .where('workspace_id', '=', workspaceId)
    .where('media_asset_id', '=', id)
    .execute();
  return [asset.storage_key, ...renditions.map((rendition) => rendition.storage_key)];
}

async function purgeDeleted(db: Database, workspaceId: string, id: string) {
  return await db.withTenant(workspaceId, SYSTEM, async (trx) => {
    const keys = await storedKeys(trx, workspaceId, id);
    if (keys === null) return null;
    await lockStorageKeys(trx, keys);
    if ((await expiredDeleted(trx, workspaceId, id).forUpdate().executeTakeFirst()) === undefined) {
      return null;
    }
    const { used } = await trx
      .selectNoFrom(referenced(sql.val(workspaceId), sql.val(id)).as('used'))
      .executeTakeFirstOrThrow();
    if (used) return null;
    await trx
      .deleteFrom('media_assets')
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', id)
      .execute();
    return keys;
  });
}

async function removeObjects(
  db: Database,
  deps: MediaGcDeps,
  workspaceId: string,
  keys: readonly string[],
) {
  let orphaned = 0;
  for (const key of keys) {
    try {
      await removeIfUnreferenced(db, deps.store, workspaceId, key);
    } catch (err) {
      deps.logger.error({ err, workspaceId }, 'media GC could not remove a stored object');
      orphaned++;
    }
  }
  return orphaned;
}

export async function collectMedia(db: Database, deps: MediaGcDeps): Promise<string> {
  const { staging } = deps;
  const counts = {
    expired: 0,
    lost: 0,
    purged: 0,
    skipped: 0,
    orphaned: 0,
    incoming: 0,
    importsStalled: 0,
    importsDeleted: 0,
  };
  for (const { workspaceId, id } of await db.sweeps.mediaGc(MEDIA_GC_BATCH)) {
    const key = await expireUpload(db, workspaceId, id);
    if (key !== null) {
      await staging.remove(key);
      counts.expired++;
      continue;
    }
    if (await rejectLostVideo(db, staging, { workspaceId, id })) {
      counts.lost++;
      continue;
    }
    const keys = await purgeDeleted(db, workspaceId, id);
    if (keys === null) {
      counts.skipped++;
      continue;
    }
    counts.purged++;
    counts.orphaned += await removeObjects(db, deps, workspaceId, keys);
  }
  counts.incoming = await staging.sweepIncoming(INCOMING_MAX_AGE_MS);
  for (const { workspaceId, id } of await db.sweeps.mediaImports(MEDIA_GC_BATCH)) {
    const outcome = await settleExpiredImport(db, { workspaceId, id });
    if (outcome === 'stalled') counts.importsStalled++;
    if (outcome === 'deleted') counts.importsDeleted++;
  }
  return JSON.stringify(counts);
}
