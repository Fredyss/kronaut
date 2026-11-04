import { type Client, type RssFeedsListResponse, rssFeedsList } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';

export type RssFeed = RssFeedsListResponse['items'][number];
export type FeedMode = RssFeed['mode'];

export const FEED_URL_MAX = 2048;
export const FEED_NAME_MAX = 100;
export const FEED_TEMPLATE_MAX = 1000;
export const DEFAULT_TEMPLATE = '{title} {link}';
export const PLACEHOLDERS = ['title', 'link', 'summary'] as const;

export function rssFeedsKey(workspaceId: string) {
  return ['rss-feeds', workspaceId] as const;
}

export function rssFeedsQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: rssFeedsKey(workspaceId),
    queryFn: async () => (await rssFeedsList({ client, path: { workspaceId } })).data.items,
  });
}

export function feedHost(url: string): string {
  return URL.parse(url)?.host ?? '';
}
