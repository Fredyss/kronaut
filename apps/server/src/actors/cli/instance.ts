import type { Database } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';

export interface InstanceCommandDeps {
  readonly db: Database;
  readonly logger: Logger;
}

export async function restoreComplete(deps: InstanceCommandDeps): Promise<number> {
  const epoch = await deps.db.withActor({ kind: 'cli' }, async (trx) => {
    const result = await sql<{ epoch: number }>`select instance_mark_restored() as epoch`.execute(
      trx,
    );
    const row = result.rows[0];
    if (row === undefined) throw new Error('instance_mark_restored returned nothing');
    return row.epoch;
  });
  deps.logger.info({ epoch }, 'restore marked complete; publishing paused');
  return epoch;
}

export async function release(deps: InstanceCommandDeps, instanceId: string): Promise<void> {
  await deps.db.withActor({ kind: 'cli' }, (trx) =>
    sql`select instance_release(${instanceId}::uuid)`.execute(trx),
  );
  deps.logger.info({ instanceId }, 'instance released');
}
