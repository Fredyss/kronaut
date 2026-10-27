import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { TEST_NOW } from '../_kit/testing.ts';
import { tid } from './tid.ts';

const SPEC = /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/;

describe('bluesky TID', () => {
  it('matches the spec format and never repeats or regresses', () => {
    expect(tid(Temporal.Instant.fromEpochMilliseconds(0), 0)).toBe('2222222222222');
    const keys = [0, 1, 2, 1_000, 3_600_000_000].map((micros) =>
      tid(TEST_NOW.add({ microseconds: micros })),
    );
    for (const key of keys) expect(key).toMatch(SPEC);
    expect([...keys].sort()).toEqual(keys);
    expect(new Set(keys).size).toBe(keys.length);
    const later = TEST_NOW.add({ hours: 2 });
    const burst = [later, later, later.subtract({ seconds: 1 })].map((now) => tid(now));
    expect([...burst].sort()).toEqual(burst);
    expect(new Set(burst).size).toBe(burst.length);
  });
});
