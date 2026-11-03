import { describe, expect, it } from 'vitest';
import { clampAspect } from './aspect.ts';

const RANGE = { min: { width: 4, height: 5 }, max: { width: 191, height: 100 } };

describe('clampAspect', () => {
  it('raises a ratio below the minimum to the minimum', () => {
    expect(clampAspect({ width: 1000, height: 2000 }, RANGE)).toEqual({ width: 4, height: 5 });
  });

  it('keeps a ratio inside the range', () => {
    expect(clampAspect({ width: 1200, height: 900 }, RANGE)).toEqual({ width: 1200, height: 900 });
  });

  it('lowers a ratio above the maximum to the maximum', () => {
    expect(clampAspect({ width: 3000, height: 1000 }, RANGE)).toEqual({ width: 191, height: 100 });
  });
});
