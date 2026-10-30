import type { Client } from '@kronaut/sdk';
import { type QueryClient, queryOptions } from '@tanstack/react-query';
import { channelsQuery, postQuery } from '../api.ts';
import { approvalPolicyQuery } from '../approvals/queries.ts';
import { postMediaQuery } from '../post-actions/post-media.ts';
import { fromPost } from './from-post.ts';

export interface OpenScope {
  readonly client: Client;
  readonly queryClient: QueryClient;
  readonly workspaceId: string;
}

async function loadOpened({ client, queryClient, workspaceId }: OpenScope, postId: string) {
  const [post, channels] = await Promise.all([
    queryClient.fetchQuery({ ...postQuery(client, workspaceId, postId), staleTime: 0 }),
    queryClient.fetchQuery(channelsQuery(client, workspaceId)),
    queryClient.prefetchQuery(approvalPolicyQuery(client, workspaceId)),
  ]);
  const assets = await queryClient.fetchQuery(postMediaQuery(client, workspaceId, post));
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  return { post, channels, result: fromPost(post, byId, channels) };
}

export type OpenedPostData = Awaited<ReturnType<typeof loadOpened>>;

export function openedPostQuery(scope: OpenScope, postId: string, loads: number) {
  return queryOptions({
    queryKey: ['compose-open', scope.workspaceId, postId, loads],
    queryFn: () => loadOpened(scope, postId),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  });
}
