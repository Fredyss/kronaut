import { type Client, type GroupsListResponse, groupsList } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';

export type Group = GroupsListResponse['items'][number];

export const GROUP_NAME_MAX = 120;

export function groupsKey(workspaceId: string) {
  return ['groups', workspaceId] as const;
}

export function groupsQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: groupsKey(workspaceId),
    queryFn: async () => (await groupsList({ client, path: { workspaceId } })).data.items,
    staleTime: 60_000,
  });
}
