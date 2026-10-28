import type { Actor, Database, TenantDb } from '@kronaut/db';
import type { MediaStore } from '@kronaut/media';
import { sql } from 'kysely';
import { lockStorageKeys } from './key-lock.ts';
import { referenced } from './library.ts';
import type { Staging } from './staging.ts';

export const MEDIA_GC_BATCH = 500;
export const INCOMING_MAX_AGE_MS = 3_600_000;
const SYSTEM: Actor = { kind: 'system' };

export interface MediaGcDeps {
  readonly staging: Staging;
  readonly store: MediaStore;
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

async function unsharedKeys(trx: TenantDb, workspaceId: string, keys: readonly string[]) {
  const assets = trx
    .selectFrom('media_assets')
    .select('storage_key')
    .where('workspace_id', '=', workspaceId)
    .where('storage_key', 'in', keys);
  const shared = await trx
    .selectFrom('media_renditions')
    .select('storage_key')
    .where('workspace_id', '=', workspaceId)
    .where('storage_key', 'in', keys)
    .union(assets)
    .execute();
  const kept = new Set(shared.map((row) => row.storage_key));
  return keys.filter((key) => !kept.has(key));
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

async function purgeDeleted(db: Database, store: MediaStore, workspaceId: string, id: string) {
  return await db.withTenant(workspaceId, SYSTEM, async (trx) => {
    const keys = await storedKeys(trx, workspaceId, id);
    if (keys === null) return false;
    // An upload of the same file takes this lock too, so it can't revive or re-insert the row
    // while its object is being removed.
    await lockStorageKeys(trx, keys);
    if ((await expiredDeleted(trx, workspaceId, id).forUpdate().executeTakeFirst()) === undefined) {
      return false;
    }
    const { used } = await trx
      .selectNoFrom(referenced(sql.val(workspaceId), sql.val(id)).as('used'))
      .executeTakeFirstOrThrow();
    if (used) return false;
    await trx
      .deleteFrom('media_assets')
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', id)
      .execute();
    for (const key of await unsharedKeys(trx, workspaceId, keys)) await store.delete(key);
    return true;
  });
}

export async function collectMedia(db: Database, { staging, store }: MediaGcDeps): Promise<string> {
  const counts = { expired: 0, purged: 0, skipped: 0, incoming: 0 };
  for (const { workspaceId, id } of await db.sweeps.mediaGc(MEDIA_GC_BATCH)) {
    const key = await expireUpload(db, workspaceId, id);
    if (key !== null) {
      await staging.remove(key);
      counts.expired++;
      continue;
    }
    if (await purgeDeleted(db, store, workspaceId, id)) counts.purged++;
    else counts.skipped++;
  }
  counts.incoming = await staging.sweepIncoming(INCOMING_MAX_AGE_MS);
  return JSON.stringify(counts);
}
