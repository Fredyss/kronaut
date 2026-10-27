import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

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

export async function effectivePolicy(
  trx: TenantDb,
  workspaceId: string,
  brandId: string | null,
): Promise<EffectivePolicy> {
  const row = await trx
    .selectFrom('approval_policies')
    .select([
      'id',
      'version',
      'mode',
      'required_approvals',
      'allow_self_approval',
      'reschedule_tolerance_min',
    ])
    .where('workspace_id', '=', workspaceId)
    .where((eb) =>
      brandId === null
        ? eb('brand_id', 'is', null)
        : eb.or([eb('brand_id', '=', brandId), eb('brand_id', 'is', null)]),
    )
    .orderBy(sql`brand_id nulls last`)
    .limit(1)
    .executeTakeFirst();
  return policyOf(row);
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
