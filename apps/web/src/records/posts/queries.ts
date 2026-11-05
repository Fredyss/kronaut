import {
  type Client,
  type PostsGetResponse,
  type PostsListResponse,
  postsGet,
  postsList,
} from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';
import type { DayRange } from '../channels/queries.ts';

export type Post = PostsGetResponse;

export type Destination = Post['destinations'][number];

export type PostList = PostsListResponse;

export type PostSummary = PostList['items'][number];

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

export interface PostFilter {
  readonly tag?: string | undefined;
  readonly brand?: string | undefined;
}

function filterQuery({ tag, brand }: PostFilter) {
  return { ...(tag === undefined ? {} : { tag }), ...(brand === undefined ? {} : { brand }) };
}

export function postsRangeQuery(
  client: Client,
  workspaceId: string,
  { from, to }: DayRange,
  filter: PostFilter = {},
) {
  const query = { from, to, ...filterQuery(filter) };
  return queryOptions({
    queryKey: [...postsKey(workspaceId), 'range', from, to, filter.tag, filter.brand],
    queryFn: async () => (await postsList({ client, path: { workspaceId }, query })).data,
  });
}

export function draftsQuery(client: Client, workspaceId: string, filter: PostFilter = {}) {
  return queryOptions({
    queryKey: [...postsKey(workspaceId), 'unscheduled', filter.tag, filter.brand],
    queryFn: async () =>
      (
        await postsList({
          client,
          path: { workspaceId },
          query: { unscheduled: 'true', ...filterQuery(filter) },
        })
      ).data,
  });
}
