import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { withinApprovedSchedule } from './binding.ts';

const SLOT = { shownLocal: '2026-11-02 09:00:00', shownTz: 'Europe/Bratislava', toleranceMin: 30 };

function at(local: string, tz = 'Europe/Bratislava') {
  return { local: Temporal.PlainDateTime.from(local), tz };
}

describe('withinApprovedSchedule', () => {
  it('accepts wall times up to the tolerance either side', () => {
    expect(withinApprovedSchedule(at('2026-11-02T09:30:00'), SLOT)).toBe(true);
    expect(withinApprovedSchedule(at('2026-11-02T08:30:00'), SLOT)).toBe(true);
    expect(withinApprovedSchedule(at('2026-11-02T09:30:01'), SLOT)).toBe(false);
    expect(withinApprovedSchedule(at('2026-11-03T09:00:00'), SLOT)).toBe(false);
  });

  it('refuses another time zone and allows only the exact time at zero tolerance', () => {
    expect(withinApprovedSchedule(at('2026-11-02T09:00:00', 'Europe/Prague'), SLOT)).toBe(false);
    const exact = { ...SLOT, toleranceMin: 0 };
    expect(withinApprovedSchedule(at('2026-11-02T09:00:00'), exact)).toBe(true);
    expect(withinApprovedSchedule(at('2026-11-02T09:00:01'), exact)).toBe(false);
  });
});
