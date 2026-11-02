import {
  analyticsChannelMetrics,
  type ChannelsListResponse,
  type Client,
  channelsList,
  channelsProviders,
  type DestinationsNeedsActionResponse,
  destinationsNeedsAction,
  type NotificationsListResponse,
  notificationsList,
} from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';
import { NEEDS_ACTION_POLL_MS } from './posts/destinations.ts';

export type Channel = ChannelsListResponse['items'][number];

export type NeedsAction = DestinationsNeedsActionResponse;

export type NeedsActionItem = NeedsAction['items'][number];

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

export function needsActionKey(workspaceId: string) {
  return ['needs-action', workspaceId] as const;
}

export function needsActionQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: needsActionKey(workspaceId),
    queryFn: async () => (await destinationsNeedsAction({ client, path: { workspaceId } })).data,
    refetchInterval: NEEDS_ACTION_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

export type NotificationList = NotificationsListResponse;

export type NotificationItem = NotificationList['items'][number];

export const NOTIFICATIONS_LIMIT = 20;

export function notificationsKey(workspaceId: string) {
  return ['notifications', workspaceId] as const;
}

export function notificationsQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: notificationsKey(workspaceId),
    queryFn: async () =>
      (
        await notificationsList({
          client,
          path: { workspaceId },
          query: { limit: String(NOTIFICATIONS_LIMIT) },
        })
      ).data,
    refetchInterval: NEEDS_ACTION_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

export const ANALYTICS_ROLES: ReadonlySet<string> = new Set([
  'owner',
  'admin',
  'editor',
  'contributor',
  'viewer',
]);
