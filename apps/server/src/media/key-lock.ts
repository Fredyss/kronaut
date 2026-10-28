import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

export async function lockStorageKeys(trx: TenantDb, keys: readonly string[]): Promise<void> {
  for (const key of [...new Set(keys)].sort()) {
    await sql`select pg_advisory_xact_lock(hashtextextended(${`media_key:${key}`}, 0))`.execute(
      trx,
    );
  }
}
