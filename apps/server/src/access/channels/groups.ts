import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

export async function loadChannelGroups(
  trx: TenantDb,
  workspaceId: string,
  accountIds: readonly string[],
): Promise<ReadonlyMap<string, readonly string[]>> {
  if (accountIds.length === 0) return new Map();
  const rows = await trx
    .selectFrom('account_group_members as m')
    .innerJoin('account_groups as g', (join) =>
      join.onRef('g.workspace_id', '=', 'm.workspace_id').onRef('g.id', '=', 'm.group_id'),
    )
    .select(['m.social_account_id', 'g.id'])
    .where('m.workspace_id', '=', workspaceId)
    .where('m.social_account_id', 'in', accountIds)
    .orderBy(sql`lower(g.name)`)
    .orderBy('g.id')
    .execute();
  const groups = Map.groupBy(rows, (row) => row.social_account_id);
  return new Map(
    [...groups].map(([accountId, list]) => [
      accountId,
      list.map((row) => encodePublicId('group', row.id)),
    ]),
  );
}
