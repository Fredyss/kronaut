import {
  type ApprovalsPolicyResponse,
  approvalsPolicy,
  type Client,
  type PostsApprovalRequestsResponse,
  postsApprovalRequests,
} from '@kronaut/sdk';
import { type QueryClient, queryOptions } from '@tanstack/react-query';
import { detailCodes, errorCode, notificationsKey, postKey, postsKey } from '../api.ts';
import type { ComposeWhen } from '../compose/submit.ts';

export type PolicyResponse = ApprovalsPolicyResponse;

export type PolicyValues = PolicyResponse['effective'];

export type StoredPolicy = PolicyResponse['brands'][number];

export type ApprovalRequest = PostsApprovalRequestsResponse['items'][number];

export function approvalPolicyKey(workspaceId: string) {
  return ['approval-policy', workspaceId] as const;
}

export function approvalPolicyQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: approvalPolicyKey(workspaceId),
    queryFn: async () => (await approvalsPolicy({ client, path: { workspaceId } })).data,
    staleTime: 60_000,
  });
}

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

export function policyForPost(policy: PolicyResponse, brandId: string | null): PolicyValues {
  const override =
    brandId === null ? undefined : policy.brands.find((brand) => brand.brandId === brandId);
  return override ?? policy.effective;
}

export function approvalRequired(
  policy: PolicyResponse | undefined,
  brandId: string | null,
): boolean {
  return policy !== undefined && policyForPost(policy, brandId).mode === 'required';
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

export function approvalBody(version: number, when: ComposeWhen, note: string) {
  const trimmed = note.trim().normalize('NFC');
  return {
    expectedVersion: version,
    ...(when.mode === 'instant'
      ? { schedule: { scheduleLocal: when.scheduleLocal, scheduleTz: when.scheduleTz } }
      : {}),
    ...(when.mode === 'instant' && when.repeat !== undefined ? { repeat: when.repeat } : {}),
    ...(trimmed === '' ? {} : { note: trimmed }),
  };
}
