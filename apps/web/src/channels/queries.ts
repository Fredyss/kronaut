import {
  analyticsChannelMetrics,
  type ChannelsListResponse,
  type Client,
  channelsList,
  channelsProviders,
} from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';

export type Channel = ChannelsListResponse['items'][number];

export function channelsKey(workspaceId: string) {
  return ['channels', workspaceId] as const;
}

export function channelsQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: channelsKey(workspaceId),
    queryFn: async () => (await channelsList({ client, path: { workspaceId } })).data.items,
  });
}

export function connectableQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: ['channels', workspaceId, 'providers'],
    queryFn: async () => (await channelsProviders({ client, path: { workspaceId } })).data.items,
    staleTime: 60_000,
  });
}

export interface DayRange {
  readonly from: string;
  readonly to: string;
}

export function channelMetricsQuery(
  client: Client,
  workspaceId: string,
  channelId: string,
  query: DayRange,
) {
  return queryOptions({
    queryKey: ['channel-metrics', workspaceId, channelId, query.from, query.to],
    queryFn: async () =>
      (await analyticsChannelMetrics({ client, path: { workspaceId, channelId }, query })).data,
  });
}
