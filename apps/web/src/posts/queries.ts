import {
  type Client,
  type PostsGetResponse,
  type PostsListResponse,
  postsGet,
  postsList,
} from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';
import type { DayRange } from '../api.ts';

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

function tagQuery(tag: string | undefined) {
  return tag === undefined ? {} : { tag };
}

export function postsRangeQuery(
  client: Client,
  workspaceId: string,
  { from, to }: DayRange,
  tag?: string,
) {
  return queryOptions({
    queryKey: [...postsKey(workspaceId), 'range', from, to, tag],
    queryFn: async () =>
      (await postsList({ client, path: { workspaceId }, query: { from, to, ...tagQuery(tag) } }))
        .data,
  });
}

export function draftsQuery(client: Client, workspaceId: string, tag?: string) {
  return queryOptions({
    queryKey: [...postsKey(workspaceId), 'unscheduled', tag],
    queryFn: async () =>
      (
        await postsList({
          client,
          path: { workspaceId },
          query: { unscheduled: 'true', ...tagQuery(tag) },
        })
      ).data,
  });
}
