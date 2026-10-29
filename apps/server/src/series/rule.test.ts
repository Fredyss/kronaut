import {
  formatRule,
  nextOccurrence,
  occurrenceAt,
  parseRule,
  type RepeatRule,
  RuleError,
  type RuleSeries,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { resolveLocal } from '../posts/freeze.ts';

function series(rule: RepeatRule, dtstart: string): RuleSeries {
  return { rule, dtstart: Temporal.PlainDateTime.from(dtstart) };
}

function expand(s: RuleSeries, n: number): string[] {
  const out: string[] = [];
  for (let index = 1; index <= n; index++) {
    const local = occurrenceAt(s, index);
    if (local === null) break;
    out.push(local.toString());
  }
  return out;
}

describe('formatRule / parseRule', () => {
  it('round-trips the supported subset', () => {
    const rule: RepeatRule = { freq: 'weekly', interval: 2, byDay: ['we', 'mo'], count: 5 };
    const text = formatRule(rule);
    expect(text).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=5');
    expect(parseRule(text)).toEqual({ ...rule, byDay: ['mo', 'we'] });
    expect(parseRule('FREQ=MONTHLY;BYMONTHDAY=31;UNTIL=20270131')).toEqual({
      freq: 'monthly',
      byMonthDay: 31,
      until: '2027-01-31',
    });
    expect(formatRule({ freq: 'daily', interval: 1 })).toBe('FREQ=DAILY');
  });

  it.each([
    'FREQ=YEARLY',
    'FREQ=DAILY;BYHOUR=9',
    'FREQ=DAILY;INTERVAL=100',
    'FREQ=DAILY;INTERVAL=0',
    'FREQ=WEEKLY',
    'FREQ=WEEKLY;BYDAY=MO,MO',
    'FREQ=DAILY;BYDAY=MO',
    'FREQ=MONTHLY;BYMONTHDAY=1,15',
    'FREQ=MONTHLY;BYMONTHDAY=32',
    'FREQ=DAILY;COUNT=501',
    'FREQ=DAILY;COUNT=2;UNTIL=20270101',
    'FREQ=DAILY;UNTIL=20270230',
    'FREQ=DAILY;FREQ=DAILY',
    'freq=daily',
    '',
  ])('rejects %j', (text) => {
    expect(() => parseRule(text)).toThrow(RuleError);
  });
});

describe('nextOccurrence', () => {
  it('takes the chosen days of every second ISO week', () => {
    const s = series({ freq: 'weekly', interval: 2, byDay: ['mo', 'we'] }, '2026-11-04T09:00');
    expect(expand(s, 5)).toEqual([
      '2026-11-04T09:00:00',
      '2026-11-16T09:00:00',
      '2026-11-18T09:00:00',
      '2026-11-30T09:00:00',
      '2026-12-02T09:00:00',
    ]);
  });

  it('skips the months without the 31st', () => {
    const s = series({ freq: 'monthly', byMonthDay: 31 }, '2027-01-31T08:00');
    expect(expand(s, 4)).toEqual([
      '2027-01-31T08:00:00',
      '2027-03-31T08:00:00',
      '2027-05-31T08:00:00',
      '2027-07-31T08:00:00',
    ]);
  });

  it('ends after COUNT occurrences and past the UNTIL day', () => {
    const counted = series({ freq: 'daily', count: 3 }, '2026-11-01T10:00');
    expect(expand(counted, 10)).toHaveLength(3);
    const third = Temporal.PlainDateTime.from('2026-11-03T10:00');
    expect(nextOccurrence(counted, { index: 3, local: third })).toBeNull();
    const until = series({ freq: 'daily', interval: 2, until: '2026-11-05' }, '2026-11-01T23:30');
    expect(expand(until, 10)).toEqual([
      '2026-11-01T23:30:00',
      '2026-11-03T23:30:00',
      '2026-11-05T23:30:00',
    ]);
  });

  it('keeps 02:30 local time across the spring-forward gap', () => {
    const s = series({ freq: 'daily' }, '2027-03-27T02:30');
    const [before, gap, after] = expand(s, 3).map((local) =>
      resolveLocal(Temporal.PlainDateTime.from(local), 'Europe/Bratislava'),
    );
    expect(before).toMatchObject({ resolution: 'exact' });
    expect(before?.at.toString()).toBe('2027-03-27T01:30:00Z');
    expect(gap).toMatchObject({ resolution: 'gap_forward' });
    expect(gap?.local.toString()).toBe('2027-03-28T03:30:00');
    expect(gap?.at.toString()).toBe('2027-03-28T01:30:00Z');
    expect(after?.local.toString()).toBe('2027-03-29T02:30:00');
    expect(after?.at.toString()).toBe('2027-03-29T00:30:00Z');
  });
});
