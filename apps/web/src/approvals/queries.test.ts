import { describe, expect, it } from 'vitest';
import { type PolicyResponse, policyForPost } from './queries.ts';

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

describe('policy for a post', () => {
  it("uses the brand's override and otherwise the effective policy", () => {
    expect(policyForPost(POLICY, 'brand_1').mode).toBe('none');
    expect(policyForPost(POLICY, 'brand_2')).toBe(POLICY.effective);
    expect(policyForPost(POLICY, null)).toBe(POLICY.effective);
  });
});
