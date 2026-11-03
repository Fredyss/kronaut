import type { Actor, Database, TenantDb } from '@kronaut/db';
import type { MediaStore } from '@kronaut/media';
import { sql } from 'kysely';

const SYSTEM: Actor = { kind: 'system' };

export async function lockStorageKeys(trx: TenantDb, keys: readonly string[]): Promise<void> {
  for (const key of [...new Set(keys)].sort()) {
    await sql`select pg_advisory_xact_lock(hashtextextended(${`media_key:${key}`}, 0))`.execute(
      trx,
    );
  }
}

async function keyReferenced(trx: TenantDb, workspaceId: string, key: string): Promise<boolean> {
  const assets = trx
    .selectFrom('media_assets')
    .select('storage_key')
    .where('workspace_id', '=', workspaceId)
    .where('storage_key', '=', key);
  const rows = await trx
    .selectFrom('media_renditions')
    .select('storage_key')
    .where('workspace_id', '=', workspaceId)
    .where('storage_key', '=', key)
    .union(assets)
    .execute();
  return rows.length > 0;
}

export async function removeIfUnreferenced(
  db: Database,
  store: MediaStore,
  workspaceId: string,
  key: string,
): Promise<boolean> {
  return await db.withTenant(workspaceId, SYSTEM, async (trx) => {
    // Every ingest path takes this lock before it inserts or revives a row for the key.
    await lockStorageKeys(trx, [key]);
    if (await keyReferenced(trx, workspaceId, key)) return false;
    await store.delete(key);
    return true;
  });
}
