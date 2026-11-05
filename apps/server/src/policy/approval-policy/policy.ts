import type { TenantDb } from '@kronaut/db';

export interface EffectivePolicy {
  readonly id: string | null;
  readonly version: number | null;
  readonly mode: 'none' | 'required';
  readonly requiredApprovals: number;
  readonly allowSelfApproval: boolean;
  readonly rescheduleToleranceMin: number;
}

export interface PolicyRow {
  readonly id: string;
  readonly version: number;
  readonly mode: string;
  readonly required_approvals: number;
  readonly allow_self_approval: boolean;
  readonly reschedule_tolerance_min: number;
}

export const STRICTEST_POLICY: EffectivePolicy = {
  id: null,
  version: null,
  mode: 'required',
  requiredApprovals: 1,
  allowSelfApproval: false,
  rescheduleToleranceMin: 0,
};

export function policyOf(row: PolicyRow | undefined): EffectivePolicy {
  if (row === undefined) return STRICTEST_POLICY;
  return {
    id: row.id,
    version: row.version,
    mode: row.mode === 'none' ? 'none' : 'required',
    requiredApprovals: row.required_approvals,
    allowSelfApproval: row.allow_self_approval,
    rescheduleToleranceMin: row.reschedule_tolerance_min,
  };
}

interface ScopedPolicyRow extends PolicyRow {
  readonly brand_id: string | null;
}

function combined(sources: readonly EffectivePolicy[]): EffectivePolicy {
  const required = sources.filter((source) => source.mode === 'required');
  const counted = required.length > 0 ? required : sources;
  const ids = new Set(sources.map((source) => source.id));
  const [only] = sources;
  const single = ids.size === 1 && only !== undefined;
  return {
    id: single ? only.id : null,
    version: single ? only.version : null,
    mode: required.length > 0 ? 'required' : 'none',
    requiredApprovals: Math.max(1, ...counted.map((source) => source.requiredApprovals)),
    allowSelfApproval: sources.every((source) => source.allowSelfApproval),
    rescheduleToleranceMin: Math.min(...sources.map((source) => source.rescheduleToleranceMin)),
  };
}

export function combinePolicies(
  brands: readonly (string | null)[],
  rows: readonly ScopedPolicyRow[],
): EffectivePolicy {
  const workspace = rows.find((row) => row.brand_id === null);
  const brandRow = (brandId: string | null) =>
    (brandId === null ? undefined : rows.find((row) => row.brand_id === brandId)) ?? workspace;
  const keys = brands.length === 0 ? [null] : [...new Set(brands)];
  return combined(keys.map((brandId) => policyOf(brandRow(brandId))));
}

const POLICY_COLUMNS = [
  'brand_id',
  'id',
  'version',
  'mode',
  'required_approvals',
  'allow_self_approval',
  'reschedule_tolerance_min',
] as const;

export async function workspacePolicy(
  trx: TenantDb,
  workspaceId: string,
): Promise<EffectivePolicy> {
  const row = await trx
    .selectFrom('approval_policies')
    .select(POLICY_COLUMNS)
    .where('workspace_id', '=', workspaceId)
    .where('brand_id', 'is', null)
    .executeTakeFirst();
  return policyOf(row);
}

export async function postPolicy(
  trx: TenantDb,
  workspaceId: string,
  postId: string,
): Promise<EffectivePolicy> {
  const destinations = await trx
    .selectFrom('post_destinations as d')
    .innerJoin('social_accounts as a', (join) =>
      join.onRef('a.workspace_id', '=', 'd.workspace_id').onRef('a.id', '=', 'd.social_account_id'),
    )
    .select('a.brand_id')
    .distinct()
    .where('d.workspace_id', '=', workspaceId)
    .where('d.post_id', '=', postId)
    .where('d.state', '<>', 'canceled')
    .execute();
  const brands = destinations.map((row) => row.brand_id);
  const brandIds = brands.filter((brandId) => brandId !== null);
  const rows = await trx
    .selectFrom('approval_policies')
    .select(POLICY_COLUMNS)
    .where('workspace_id', '=', workspaceId)
    .where((eb) =>
      brandIds.length === 0
        ? eb('brand_id', 'is', null)
        : eb.or([eb('brand_id', 'is', null), eb('brand_id', 'in', brandIds)]),
    )
    .execute();
  return combinePolicies(brands, rows);
}

export function policySnapshot(policy: EffectivePolicy): string {
  return JSON.stringify({
    id: policy.id,
    version: policy.version,
    mode: policy.mode,
    required_approvals: policy.requiredApprovals,
    allow_self_approval: policy.allowSelfApproval,
    reschedule_tolerance_min: policy.rescheduleToleranceMin,
  });
}
