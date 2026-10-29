import {
  ApiRequestError,
  type AuthMeResponse,
  analyticsChannelMetrics,
  authMe,
  type ChannelsListResponse,
  type Client,
  channelsList,
  channelsProviders,
  type DestinationsNeedsActionResponse,
  destinationsNeedsAction,
  type NotificationsListResponse,
  notificationsList,
  type PostsGetResponse,
  type PostsListResponse,
  postsGet,
  postsList,
} from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';
import { NEEDS_ACTION_POLL_MS } from './destinations.ts';

export type Me = AuthMeResponse;

export type Channel = ChannelsListResponse['items'][number];

export type Post = PostsGetResponse;

export type Destination = Post['destinations'][number];

export type PostList = PostsListResponse;

export type PostSummary = PostList['items'][number];

export type NeedsAction = DestinationsNeedsActionResponse;

export type NeedsActionItem = NeedsAction['items'][number];

export interface ErrorDetail {
  readonly path: string;
  readonly code: string;
}

export const ME_KEY = ['me'] as const;

export function meQuery(client: Client) {
  return queryOptions({
    queryKey: ME_KEY,
    queryFn: async () => (await authMe({ client })).data,
    staleTime: 60_000,
  });
}

export function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 401;
}

export function errorCode(error: unknown): string {
  return error instanceof ApiRequestError ? error.code : 'internal';
}

export function channelsQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: ['channels', workspaceId],
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

export function errorStatus(error: unknown): number | null {
  return error instanceof ApiRequestError ? error.status : null;
}

export function detailCodes(error: unknown): readonly string[] {
  if (!(error instanceof ApiRequestError)) return [];
  return error.body.error.details?.map((detail) => detail.code) ?? [];
}

export function errorDetails(error: unknown): readonly ErrorDetail[] {
  if (!(error instanceof ApiRequestError)) return [];
  return error.body.error.details ?? [];
}

export function postKey(workspaceId: string, postId: string) {
  return ['posts', workspaceId, postId] as const;
}

export function postQuery(client: Client, workspaceId: string, postId: string) {
  return queryOptions({
    queryKey: postKey(workspaceId, postId),
    queryFn: async () => (await postsGet({ client, path: { workspaceId, postId } })).data,
  });
}

export function postsKey(workspaceId: string) {
  return ['posts', workspaceId] as const;
}

export function postsRangeQuery(client: Client, workspaceId: string, from: string, to: string) {
  return queryOptions({
    queryKey: [...postsKey(workspaceId), 'range', from, to],
    queryFn: async () =>
      (await postsList({ client, path: { workspaceId }, query: { from, to } })).data,
  });
}

export function draftsQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: [...postsKey(workspaceId), 'unscheduled'],
    queryFn: async () =>
      (await postsList({ client, path: { workspaceId }, query: { unscheduled: 'true' } })).data,
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
export const DRAFT_ROLES: ReadonlySet<string> = new Set([
  'owner',
  'admin',
  'editor',
  'contributor',
]);

export const ANALYTICS_ROLES: ReadonlySet<string> = new Set([
  'owner',
  'admin',
  'editor',
  'contributor',
  'viewer',
]);
