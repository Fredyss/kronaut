import type { Actor, Database } from '@kronaut/db';
import { sql } from 'kysely';
import type { Staging } from './staging.ts';

export const MEDIA_GC_BATCH = 500;
export const INCOMING_MAX_AGE_MS = 3_600_000;
const SYSTEM: Actor = { kind: 'system' };

export interface MediaGcDeps {
  readonly staging: Staging;
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

export async function collectMedia(db: Database, { staging }: MediaGcDeps): Promise<string> {
  const counts = { expired: 0, skipped: 0, incoming: 0 };
  for (const candidate of await db.sweeps.mediaGc(MEDIA_GC_BATCH)) {
    const key = await expireUpload(db, candidate.workspaceId, candidate.id);
    if (key === null) {
      counts.skipped++;
      continue;
    }
    await staging.remove(key);
    counts.expired++;
  }
  counts.incoming = await staging.sweepIncoming(INCOMING_MAX_AGE_MS);
  return JSON.stringify(counts);
}
