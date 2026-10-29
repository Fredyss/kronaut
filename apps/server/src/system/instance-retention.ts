import type { Actor, Database } from '@kronaut/db';
import { sql } from 'kysely';

const SYSTEM: Actor = { kind: 'system' };
const PURGE_BATCH = 10_000;
const PURGE_MAX_BATCHES = 100;

export async function purgeInstanceRetention(
  db: Database,
  batch: number = PURGE_BATCH,
): Promise<string> {
  const totals: Record<string, number> = {};
  let drained = false;
  for (let round = 0; round < PURGE_MAX_BATCHES && !drained; round++) {
    const rows = await db.withActor(SYSTEM, async (trx) => {
      const result = await sql<{ relation: string; affected: string }>`
        select relation, affected from purge_instance_retention(${batch})
      `.execute(trx);
      return result.rows;
    });
    drained = true;
    for (const row of rows) {
      const affected = Number(row.affected);
      totals[row.relation] = (totals[row.relation] ?? 0) + affected;
      if (affected > 0) drained = false;
    }
  }
  if (!drained) {
    throw new Error(
      `instance retention stopped at the ${PURGE_MAX_BATCHES}-batch cap: ${JSON.stringify(totals)}`,
    );
  }
  return JSON.stringify(totals);
}
