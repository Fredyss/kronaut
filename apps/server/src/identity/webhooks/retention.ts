import type { Actor, Database } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { CRON_TASKS } from '../../infrastructure/jobs/cron-tasks.ts';
import { sweepCron } from '../../infrastructure/jobs/workspace-sweep.ts';

export const WEBHOOK_RETENTION_DAYS = 30;
const DELETE_BATCH = 10_000;
const SYSTEM: Actor = { kind: 'system' };

async function dropExpiredSecrets(db: Database, workspaceId: string): Promise<void> {
  await db.withTenant(workspaceId, SYSTEM, async (trx) => {
    await trx
      .updateTable('webhook_endpoints')
      .set({
        previous_secret_ciphertext: null,
        previous_secret_nonce: null,
        previous_secret_wrapped_dek: null,
        previous_secret_expires_at: null,
      })
      .where('workspace_id', '=', workspaceId)
      .where('previous_secret_expires_at', '<=', sql<Date>`now()`)
      .execute();
  });
}

// Deliveries go with their event (ON DELETE CASCADE); a delivery's retries end within two days of it.
async function purgeWorkspace(db: Database, workspaceId: string, batch: number): Promise<number> {
  await dropExpiredSecrets(db, workspaceId);
  let total = 0;
  for (;;) {
    const deleted = await db.withTenant(workspaceId, SYSTEM, async (trx) => {
      const result = await trx
        .deleteFrom('webhook_events')
        .where('workspace_id', '=', workspaceId)
        .where('id', 'in', (eb) =>
          eb
            .selectFrom('webhook_events')
            .select('id')
            .where('workspace_id', '=', workspaceId)
            .where(
              'occurred_at',
              '<',
              sql<Date>`now() - make_interval(days => ${WEBHOOK_RETENTION_DAYS})`,
            )
            .orderBy('id')
            .limit(batch),
        )
        .executeTakeFirst();
      return Number(result.numDeletedRows);
    });
    total += deleted;
    if (deleted < batch) return total;
  }
}

export async function purgeWebhookEvents(
  deps: { readonly db: Database; readonly logger: Logger },
  batch: number = DELETE_BATCH,
): Promise<string> {
  const counts = { workspaces: 0, events: 0, failed: 0 };
  return await sweepCron(deps, CRON_TASKS.webhookRetention, counts, async (workspaceId) => {
    counts.workspaces++;
    counts.events += await purgeWorkspace(deps.db, workspaceId, batch);
  });
}
