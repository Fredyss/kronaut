import { describe, expect, it } from 'vitest';
import { policyOf, policySnapshot } from './policy.ts';

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
