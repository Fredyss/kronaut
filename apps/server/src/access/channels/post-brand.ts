import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

export async function recomputePostBrand(
  trx: TenantDb,
  workspaceId: string,
  postIds: readonly string[],
): Promise<void> {
  if (postIds.length === 0) return;
  const shared = sql<string | null>`(
    SELECT CASE WHEN count(*) > 0 AND count(a.brand_id) = count(*) AND count(DISTINCT a.brand_id) = 1
      THEN min(a.brand_id::text)::uuid END
    FROM post_destinations d
    JOIN social_accounts a ON a.workspace_id = d.workspace_id AND a.id = d.social_account_id
    WHERE d.workspace_id = posts.workspace_id AND d.post_id = posts.id AND d.state <> 'canceled')`;
  await trx
    .updateTable('posts')
    .set({ brand_id: shared, location_id: null })
    .where('workspace_id', '=', workspaceId)
    .where('id', 'in', postIds)
    .where(sql<boolean>`brand_id IS DISTINCT FROM ${shared}`)
    .execute();
}
