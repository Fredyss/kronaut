import type { Actor, Database } from '@kronaut/db';
import { sql } from 'kysely';

export const NOTIFICATION_RETENTION_DAYS = 90;
const DELETE_BATCH = 10_000;
const WORKSPACE_PAGE = 1000;
const SYSTEM: Actor = { kind: 'system' };

async function purgeWorkspace(db: Database, workspaceId: string, batch: number): Promise<number> {
  let total = 0;
  for (;;) {
    const deleted = await db.withTenant(workspaceId, SYSTEM, async (trx) => {
      const result = await trx
        .deleteFrom('notifications')
        .where('workspace_id', '=', workspaceId)
        .where('id', 'in', (eb) =>
          eb
            .selectFrom('notifications')
            .select('id')
            .where('workspace_id', '=', workspaceId)
            .where(
              'created_at',
              '<',
              sql<Date>`now() - make_interval(days => ${NOTIFICATION_RETENTION_DAYS})`,
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

export async function purgeNotifications(
  db: Database,
  batch: number = DELETE_BATCH,
): Promise<string> {
  const counts = { workspaces: 0, notifications: 0 };
  let after: string | null = null;
  for (;;) {
    const page = await db.sweeps.workspaces(after, WORKSPACE_PAGE);
    for (const workspaceId of page) {
      counts.workspaces++;
      counts.notifications += await purgeWorkspace(db, workspaceId, batch);
    }
    after = page.at(-1) ?? null;
    if (page.length < WORKSPACE_PAGE) return JSON.stringify(counts);
  }
}
