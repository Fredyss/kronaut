import {
  type Client,
  type PostsApprovalRequestsResponse,
  postsApprovalRequests,
} from '@kronaut/sdk';
import { type QueryClient, queryOptions } from '@tanstack/react-query';
import { detailCodes, errorCode } from '../api/errors.ts';
import { notificationsKey } from '../notifications/queries.ts';
import { postKey, postsKey } from '../posts/queries.ts';

export type ApprovalRequest = PostsApprovalRequestsResponse['items'][number];

export function approvalRequestsKey(workspaceId: string, postId: string) {
  return [...postKey(workspaceId, postId), 'approval-requests'] as const;
}

export function approvalRequestsQuery(client: Client, workspaceId: string, postId: string) {
  return queryOptions({
    queryKey: approvalRequestsKey(workspaceId, postId),
    queryFn: async () =>
      (await postsApprovalRequests({ client, path: { workspaceId, postId } })).data.items,
  });
}

export function refreshApproval(
  queryClient: QueryClient,
  workspaceId: string,
  postId: string,
): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: postKey(workspaceId, postId) }),
    queryClient.invalidateQueries({ queryKey: postsKey(workspaceId) }),
    queryClient.invalidateQueries({ queryKey: notificationsKey(workspaceId) }),
  ]).then(() => undefined);
}

export function denyCode(error: unknown): string {
  const code = errorCode(error);
  return code === 'forbidden' ? (detailCodes(error)[0] ?? code) : code;
}

export function hasDetail(error: unknown, code: string): boolean {
  return detailCodes(error).includes(code);
}
