import { type Client, type NotificationsListResponse, notificationsList } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';
import { NEEDS_ACTION_POLL_MS } from '../inbox/queries.ts';

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
