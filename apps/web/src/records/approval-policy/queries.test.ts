import { describe, expect, it } from 'vitest';
import { type PolicyResponse, policyForBrands } from './queries.ts';

const VALUES = {
  mode: 'required',
  requiredApprovals: 1,
  allowSelfApproval: false,
  rescheduleToleranceMin: 0,
} as const;

const POLICY: PolicyResponse = {
  workspace: null,
  brands: [
    {
      ...VALUES,
      mode: 'none',
      brandId: 'brand_1',
      version: 1,
      updatedAt: '2026-10-24T07:00:00.000Z',
    },
  ],
  effective: VALUES,
};

describe('policy for the brands of a post', () => {
  it("uses the brand's override and otherwise the effective policy", () => {
    expect(policyForBrands(POLICY, ['brand_1']).mode).toBe('none');
    expect(policyForBrands(POLICY, ['brand_2'])).toEqual(POLICY.effective);
    expect(policyForBrands(POLICY, [])).toEqual(POLICY.effective);
  });

  it('takes the strictest value of each field across brands', () => {
    const loose = { ...VALUES, mode: 'none' as const, requiredApprovals: 3 };
    const mixed: PolicyResponse = {
      ...POLICY,
      brands: [
        { ...POLICY.brands[0], ...loose, allowSelfApproval: true, rescheduleToleranceMin: 30 },
      ],
      effective: { ...VALUES, requiredApprovals: 2, rescheduleToleranceMin: 10 },
    } as PolicyResponse;
    expect(policyForBrands(mixed, ['brand_1', null])).toEqual({
      mode: 'required',
      requiredApprovals: 2,
      allowSelfApproval: false,
      rescheduleToleranceMin: 10,
    });
  });
});
