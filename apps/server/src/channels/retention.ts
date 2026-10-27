import type { Actor, Database } from '@kronaut/db';
import { sql } from 'kysely';

export const DISCONNECTED_CREDENTIAL_DAYS = 30;
const DELETE_BATCH = 10_000;
const WORKSPACE_PAGE = 1000;
const SYSTEM: Actor = { kind: 'system' };

async function purgeWorkspace(db: Database, workspaceId: string, batch: number): Promise<number> {
  let total = 0;
  for (;;) {
    const deleted = await db.withTenant(workspaceId, SYSTEM, async (trx) => {
      const result = await trx
        .deleteFrom('account_credentials')
        .where('workspace_id', '=', workspaceId)
        .where('id', 'in', (eb) =>
          eb
            .selectFrom('account_credentials as c')
            .innerJoin('social_accounts as a', (join) =>
              join
                .onRef('a.workspace_id', '=', 'c.workspace_id')
                .onRef('a.id', '=', 'c.social_account_id'),
            )
            .select('c.id')
            .where('c.workspace_id', '=', workspaceId)
            .where('a.status', '=', 'disconnected')
            .where(
              'a.status_changed_at',
              '<',
              sql<Date>`now() - make_interval(days => ${DISCONNECTED_CREDENTIAL_DAYS})`,
            )
            .orderBy('c.id')
            .limit(batch),
        )
        .executeTakeFirst();
      return Number(result.numDeletedRows);
    });
    total += deleted;
    if (deleted < batch) return total;
  }
}

export async function purgeDisconnectedCredentials(
  db: Database,
  batch: number = DELETE_BATCH,
): Promise<string> {
  const counts = { workspaces: 0, credentials: 0 };
  let after: string | null = null;
  for (;;) {
    const page = await db.sweeps.workspaces(after, WORKSPACE_PAGE);
    for (const workspaceId of page) {
      counts.workspaces++;
      counts.credentials += await purgeWorkspace(db, workspaceId, batch);
    }
    after = page.at(-1) ?? null;
    if (page.length < WORKSPACE_PAGE) return JSON.stringify(counts);
  }
}
