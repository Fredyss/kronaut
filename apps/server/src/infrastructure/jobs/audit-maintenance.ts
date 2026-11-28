import type { Actor, Database } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { CRON_TASKS } from './cron-tasks.ts';

const SYSTEM: Actor = { kind: 'system' };
const AUDIT_BATCH = 10_000;
const AUDIT_MAX_BATCHES = 100;

export async function maintainAuditPartitions(db: Database, logger: Logger): Promise<string> {
  const totals: Record<string, number> = {};
  let drained = false;
  for (let batch = 0; batch < AUDIT_MAX_BATCHES && !drained; batch++) {
    const rows = await db.withActor(SYSTEM, async (trx) => {
      const result = await sql<{ relation: string; affected: string }>`
        select relation, affected from maintain_audit_partitions(${AUDIT_BATCH})
      `.execute(trx);
      return result.rows;
    });
    let pii = 0;
    for (const row of rows) {
      const affected = Number(row.affected);
      if (row.relation === 'audit_events_default') totals[row.relation] = affected;
      else totals[row.relation] = (totals[row.relation] ?? 0) + affected;
      if (row.relation === 'audit_events.pii') pii = affected;
    }
    drained = pii < AUDIT_BATCH;
  }
  const stranded = totals.audit_events_default ?? 0;
  if (stranded > 0) {
    logger.error(
      { task: CRON_TASKS.auditMaintenance, rows: stranded },
      'audit_events_default holds rows; their months cannot get a partition',
    );
  }
  if (!drained) {
    throw new Error(
      `audit PII nulling stopped at the ${AUDIT_MAX_BATCHES}-batch cap: ${JSON.stringify(totals)}`,
    );
  }
  return JSON.stringify(totals);
}
