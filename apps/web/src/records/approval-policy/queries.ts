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

function sourceFor(policy: PolicyResponse, brandId: string | null): PolicyValues {
  const override =
    brandId === null ? undefined : policy.brands.find((brand) => brand.brandId === brandId);
  return override ?? policy.effective;
}

export function policyForBrands(
  policy: PolicyResponse,
  brandIds: readonly (string | null)[],
): PolicyValues {
  const keys = brandIds.length === 0 ? [null] : [...new Set(brandIds)];
  const sources = keys.map((brandId) => sourceFor(policy, brandId));
  const required = sources.filter((source) => source.mode === 'required');
  const counted = required.length > 0 ? required : sources;
  return {
    mode: required.length > 0 ? 'required' : 'none',
    requiredApprovals: Math.max(1, ...counted.map((source) => source.requiredApprovals)),
    allowSelfApproval: sources.every((source) => source.allowSelfApproval),
    rescheduleToleranceMin: Math.min(...sources.map((source) => source.rescheduleToleranceMin)),
  };
}

export function approvalRequired(
  policy: PolicyResponse | undefined,
  brandIds: readonly (string | null)[],
): boolean {
  return policy !== undefined && policyForBrands(policy, brandIds).mode === 'required';
}
