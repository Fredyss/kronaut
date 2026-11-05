import { decodePublicId } from '@kronaut/core';
import type { Resolving } from '../deps.ts';

export interface GroupPick {
  readonly index: number;
  readonly accountId: string | null;
  readonly publishType: string;
  readonly sourceGroupId: string | null | undefined;
}

function pickKey(accountId: string | null, publishType: string): string {
  return `${accountId}\n${publishType}`;
}

async function storedPicks({ trx, workspaceId }: Resolving, postId: string | undefined) {
  if (postId === undefined) return new Map<string, string>();
  const rows = await trx
    .selectFrom('post_destinations')
    .select(['social_account_id', 'publish_type', 'source_group_id'])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .where('source_group_id', 'is not', null)
    .execute();
  return new Map(
    rows.map((row) => [
      pickKey(row.social_account_id, row.publish_type),
      row.source_group_id ?? '',
    ]),
  );
}

function memberKey(groupId: string, accountId: string): string {
  return `${groupId}\n${accountId}`;
}

// Share locks, taken before any destination row: a group delete locks the group first and its destinations
// second, so taking them in the same order here keeps the two from deadlocking.
async function lockPicked(
  { trx, workspaceId }: Resolving,
  groupIds: readonly string[],
  accountIds: readonly string[],
) {
  const groups = await trx
    .selectFrom('account_groups')
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('id', 'in', groupIds)
    .orderBy('id')
    .forKeyShare()
    .execute();
  const members =
    accountIds.length === 0
      ? []
      : await trx
          .selectFrom('account_group_members')
          .select(['group_id', 'social_account_id'])
          .where('workspace_id', '=', workspaceId)
          .where('group_id', 'in', groupIds)
          .where('social_account_id', 'in', accountIds)
          .orderBy('group_id')
          .orderBy('social_account_id')
          .forKeyShare()
          .execute();
  return {
    groups: new Set(groups.map((row) => row.id)),
    members: new Set(members.map((row) => memberKey(row.group_id, row.social_account_id))),
  };
}

// A pick the destination already stores is kept even if the channel has left the group since: the client
// sends it back unchanged on every edit.
export async function resolveSourceGroups(
  resolving: Resolving,
  picks: readonly GroupPick[],
  postId?: string,
): Promise<ReadonlyMap<number, string>> {
  const decoded = picks.flatMap(({ index, accountId, publishType, sourceGroupId }) =>
    sourceGroupId === null || sourceGroupId === undefined
      ? []
      : [
          {
            index,
            accountId,
            key: pickKey(accountId, publishType),
            groupId: decodePublicId('group', sourceGroupId),
          },
        ],
  );
  if (decoded.length === 0) return new Map();
  const stored = await storedPicks(resolving, postId);
  const groupIds = [...new Set(decoded.flatMap((pick) => pick.groupId ?? []))];
  const accountIds = [...new Set(decoded.flatMap((pick) => pick.accountId ?? []))];
  const locked =
    groupIds.length === 0
      ? { groups: new Set<string>(), members: new Set<string>() }
      : await lockPicked(resolving, groupIds, accountIds);
  const picked = new Map<number, string>();
  for (const { index, accountId, key, groupId } of decoded) {
    const path = `body.destinations.${index}.sourceGroupId`;
    if (groupId === null || !locked.groups.has(groupId)) {
      resolving.details.push({ path, code: 'not_found' });
    } else if (
      accountId !== null &&
      stored.get(key) !== groupId &&
      !locked.members.has(memberKey(groupId, accountId))
    ) {
      resolving.details.push({ path, code: 'not_in_group' });
    } else {
      picked.set(index, groupId);
    }
  }
  return picked;
}
