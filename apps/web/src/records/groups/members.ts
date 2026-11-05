import { groupsAddChannel, groupsRemoveChannel } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { type Group, groupsKey } from './queries.ts';

interface Membership {
  readonly groupId: string;
  readonly channelId: string;
  readonly member: boolean;
}

function withMember(groups: readonly Group[] | undefined, change: Membership) {
  const { groupId, channelId, member } = change;
  return groups?.map((group) => {
    if (group.id !== groupId) return group;
    const others = group.channelIds.filter((id) => id !== channelId);
    return { ...group, channelIds: member ? [...others, channelId] : others };
  });
}

export function useGroupMember(workspaceId: string, related: readonly QueryKey[]) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const queryKey = groupsKey(workspaceId);
  const patch = (change: Membership) =>
    queryClient.setQueryData<Group[]>(queryKey, (groups) => withMember(groups, change));
  return useMutation({
    mutationFn: async ({ groupId, channelId, member }: Membership) => {
      const path = { workspaceId, groupId, channelId };
      const headers = idempotency(keyFor(null, `${groupId}:${channelId}:${member}`));
      const write = member ? groupsAddChannel : groupsRemoveChannel;
      await write({ client, path, headers });
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey });
      patch(change);
    },
    onError: (error, change) => {
      patch({ ...change, member: !change.member });
      if (errorStatus(error) !== 401) toast(apiErrorMessage(errorCode(error)), 'destructive');
    },
    onSettled: () =>
      Promise.all(
        [queryKey, ...related].map((key) => queryClient.invalidateQueries({ queryKey: key })),
      ),
  });
}
