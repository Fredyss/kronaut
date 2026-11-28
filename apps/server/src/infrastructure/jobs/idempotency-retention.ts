import type { Actor, Database } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { CRON_TASKS } from './cron-tasks.ts';
import { sweepCron } from './workspace-sweep.ts';

const DELETE_BATCH = 10_000;
const SYSTEM: Actor = { kind: 'system' };

async function purgeWorkspace(db: Database, workspaceId: string, batch: number): Promise<number> {
  let total = 0;
  for (;;) {
    const deleted = await db.withTenant(workspaceId, SYSTEM, async (trx) => {
      const result = await trx
        .deleteFrom('idempotency_keys')
        .where('workspace_id', '=', workspaceId)
        .where(({ eb, refTuple, selectFrom }) =>
          eb(
            refTuple('actor_key', 'key'),
            'in',
            selectFrom('idempotency_keys')
              .select(['actor_key', 'key'])
              .where('workspace_id', '=', workspaceId)
              .where('expires_at', '<=', sql<Date>`now()`)
              .limit(batch)
              .$asTuple('actor_key', 'key'),
          ),
        )
        .executeTakeFirst();
      return Number(result.numDeletedRows);
    });
    total += deleted;
    if (deleted < batch) return total;
  }
}

export async function purgeIdempotencyKeys(
  deps: { readonly db: Database; readonly logger: Logger },
  batch: number = DELETE_BATCH,
): Promise<string> {
  const counts = { workspaces: 0, keys: 0, failed: 0 };
  return await sweepCron(deps, CRON_TASKS.idempotencyRetention, counts, async (workspaceId) => {
    counts.workspaces++;
    counts.keys += await purgeWorkspace(deps.db, workspaceId, batch);
  });
}
