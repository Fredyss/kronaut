import { type ApprovalsPolicyResponse, approvalsPolicy, type Client } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';

export type PolicyResponse = ApprovalsPolicyResponse;

export type PolicyValues = PolicyResponse['effective'];

export type StoredPolicy = PolicyResponse['brands'][number];

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
