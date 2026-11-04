import {
  type Client,
  type LinkShortenerGetResponse,
  linkShortenerGet,
  type ShortLinksPostResponse,
  shortLinksPost,
} from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';
import { postKey } from '../../records/posts/queries.ts';

export type Shortener = NonNullable<LinkShortenerGetResponse['shortener']>;
export type ShortenerProvider = Shortener['provider'];
export type DestinationLinks = ShortLinksPostResponse['destinations'][number];
export type ShortLink = DestinationLinks['links'][number];

const PENDING_POLL_MS = 10_000;

export function shortenerKey(workspaceId: string) {
  return ['link-shortener', workspaceId] as const;
}

export function shortenerQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: shortenerKey(workspaceId),
    queryFn: async () => (await linkShortenerGet({ client, path: { workspaceId } })).data.shortener,
  });
}

function anyPending(destinations: readonly DestinationLinks[] | undefined): boolean {
  return (destinations ?? []).some((d) => d.links.some((link) => link.state === 'pending'));
}

export function postShortLinksQuery(client: Client, workspaceId: string, postId: string) {
  return queryOptions({
    queryKey: [...postKey(workspaceId, postId), 'short-links'],
    queryFn: async () =>
      (await shortLinksPost({ client, path: { workspaceId, postId } })).data.destinations,
    refetchInterval: (query) => (anyPending(query.state.data) ? PENDING_POLL_MS : false),
  });
}
