import { describe, expect, it } from 'vitest';
import { BACKOFF_BASE_MS, BACKOFF_CAP_MS, backoffCapMs, backoffMs } from './backoff.ts';

describe('backoff', () => {
  it('doubles from 30 s and stops at 30 min', () => {
    expect(backoffCapMs(1)).toBe(BACKOFF_BASE_MS);
    expect(backoffCapMs(2)).toBe(60_000);
    expect(backoffCapMs(6)).toBe(960_000);
    expect(backoffCapMs(7)).toBe(BACKOFF_CAP_MS);
    expect(backoffCapMs(500)).toBe(BACKOFF_CAP_MS);
  });

  it('draws full jitter within the cap', () => {
    for (let attempt = 1; attempt <= 8; attempt++) {
      const delay = backoffMs(attempt);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(backoffCapMs(attempt));
    }
  });

  it('is deterministic with an injected random', () => {
    const calls: [number, number][] = [];
    const delay = backoffMs(3, (min, max) => {
      calls.push([min, max]);
      return max - 1;
    });
    expect(calls).toEqual([[0, 120_001]]);
    expect(delay).toBe(120_000);
  });
});
