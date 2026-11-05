import { describe, expect, it } from 'vitest';
import { combinePolicies, policyOf, policySnapshot } from './policy.ts';

describe('effective policy', () => {
  it('falls back to the strictest policy without a row', () => {
    const policy = policyOf(undefined);
    expect(policy).toEqual({
      id: null,
      version: null,
      mode: 'required',
      requiredApprovals: 1,
      allowSelfApproval: false,
      rescheduleToleranceMin: 0,
    });
    expect(JSON.parse(policySnapshot(policy))).toMatchObject({ allow_self_approval: false });
  });

  it('reads an unknown mode as required', () => {
    const row = {
      id: 'p',
      version: 3,
      mode: 'later',
      required_approvals: 2,
      allow_self_approval: true,
      reschedule_tolerance_min: 15,
    };
    expect(policyOf(row)).toMatchObject({ mode: 'required', requiredApprovals: 2, version: 3 });
    expect(policyOf({ ...row, mode: 'none' }).mode).toBe('none');
  });
});

function row(brandId: string | null, values: Partial<Parameters<typeof policyOf>[0]> = {}) {
  return {
    brand_id: brandId,
    id: `policy-${brandId ?? 'workspace'}`,
    version: 1,
    mode: 'required',
    required_approvals: 1,
    allow_self_approval: false,
    reschedule_tolerance_min: 0,
    ...values,
  };
}

describe('combined policy', () => {
  const workspace = row(null, {
    mode: 'none',
    version: 4,
    required_approvals: 3,
    allow_self_approval: true,
    reschedule_tolerance_min: 30,
  });

  it('keeps a single source, id and version included', () => {
    const brand = row('a', { required_approvals: 2, version: 7, reschedule_tolerance_min: 15 });
    expect(combinePolicies(['a', 'a'], [workspace, brand])).toEqual({
      id: 'policy-a',
      version: 7,
      mode: 'required',
      requiredApprovals: 2,
      allowSelfApproval: false,
      rescheduleToleranceMin: 15,
    });
  });

  it('requires approval when one source does, with the highest required count', () => {
    const strict = row('a', { required_approvals: 2, allow_self_approval: true });
    const policy = combinePolicies(['a', 'b'], [workspace, strict]);
    expect(policy).toMatchObject({
      mode: 'required',
      requiredApprovals: 2,
      id: null,
      version: null,
    });
  });

  it('allows self-approval only when every source allows it', () => {
    const open = row('a', { mode: 'none', allow_self_approval: true });
    expect(combinePolicies(['a', null], [workspace, open]).allowSelfApproval).toBe(true);
    const closed = row('b', { mode: 'none', allow_self_approval: false });
    expect(combinePolicies(['a', 'b'], [workspace, open, closed]).allowSelfApproval).toBe(false);
  });

  it('takes the lowest tolerance', () => {
    const tight = row('a', {
      mode: 'none',
      allow_self_approval: true,
      reschedule_tolerance_min: 5,
    });
    const policy = combinePolicies([null, 'a'], [workspace, tight]);
    expect(policy).toMatchObject({ mode: 'none', rescheduleToleranceMin: 5, requiredApprovals: 3 });
  });

  it('uses the workspace row without destinations, else the strictest default', () => {
    expect(combinePolicies([], [workspace, row('a')])).toEqual(policyOf(workspace));
    expect(combinePolicies([], [])).toEqual(policyOf(undefined));
    expect(combinePolicies(['a'], [])).toEqual(policyOf(undefined));
  });
});
