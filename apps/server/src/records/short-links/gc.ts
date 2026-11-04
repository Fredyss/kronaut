import type { Actor, Database } from '@kronaut/db';
import { sql } from 'kysely';

const SHORT_LINK_RETENTION_DAYS = 90;
const FINAL_STATES = ['published', 'failed', 'canceled'] as const;
const DELETE_BATCH = 10_000;
const WORKSPACE_PAGE = 1000;
const SYSTEM: Actor = { kind: 'system' };

async function purgeWorkspace(db: Database, workspaceId: string, batch: number): Promise<number> {
  let total = 0;
  for (;;) {
    const deleted = await db.withTenant(workspaceId, SYSTEM, async (trx) => {
      const result = await trx
        .deleteFrom('short_links')
        .where('workspace_id', '=', workspaceId)
        .where('destination_id', 'in', (eb) =>
          eb
            .selectFrom('post_destinations')
            .select('id')
            .where('workspace_id', '=', workspaceId)
            .where('state', 'in', FINAL_STATES)
            .where(
              'updated_at',
              '<',
              sql<Date>`now() - make_interval(days => ${SHORT_LINK_RETENTION_DAYS})`,
            )
            .where((inner) =>
              inner.exists(
                inner
                  .selectFrom('short_links as s')
                  .select('s.destination_id')
                  .whereRef('s.workspace_id', '=', 'post_destinations.workspace_id')
                  .whereRef('s.destination_id', '=', 'post_destinations.id'),
              ),
            )
            .orderBy('id')
            .limit(batch),
        )
        .executeTakeFirst();
      return Number(result.numDeletedRows);
    });
    total += deleted;
    if (deleted === 0) return total;
  }
}

export async function purgeShortLinks(db: Database, batch: number = DELETE_BATCH): Promise<number> {
  let total = 0;
  let after: string | null = null;
  for (;;) {
    const page = await db.sweeps.workspaces(after, WORKSPACE_PAGE);
    for (const workspaceId of page) total += await purgeWorkspace(db, workspaceId, batch);
    after = page.at(-1) ?? null;
    if (page.length < WORKSPACE_PAGE) return total;
  }
}
