import { type ChannelsQueueResponse, type Client, channelsQueue } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';

export type Queue = ChannelsQueueResponse;

export const QUEUE_ROLES: ReadonlySet<string> = new Set(['owner', 'admin']);

export function queueQuery(client: Client, workspaceId: string, channelId: string) {
  return queryOptions({
    queryKey: ['channels', workspaceId, 'queue', channelId],
    queryFn: async () => (await channelsQueue({ client, path: { workspaceId, channelId } })).data,
  });
}
