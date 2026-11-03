import { REPEAT_FREQS, REPEAT_LIMITS, type RepeatRule, WEEKDAYS } from '@kronaut/core';
import * as z from 'zod';

export const RepeatInput = z.strictObject({
  freq: z.enum(REPEAT_FREQS),
  interval: z.number().int().min(1).max(REPEAT_LIMITS.interval).optional(),
  byDay: z.array(z.enum(WEEKDAYS)).min(1).max(WEEKDAYS.length).optional(),
  byMonthDay: z.number().int().min(1).max(REPEAT_LIMITS.monthDay).optional(),
  count: z.number().int().min(1).max(REPEAT_LIMITS.count).optional(),
  until: z.iso.date().optional(),
});

export type RepeatBody = z.output<typeof RepeatInput>;

export function ruleOf(repeat: RepeatBody): RepeatRule {
  const { freq, interval, byDay, byMonthDay, count, until } = repeat;
  return {
    freq,
    ...(interval === undefined ? {} : { interval }),
    ...(byDay === undefined ? {} : { byDay }),
    ...(byMonthDay === undefined ? {} : { byMonthDay }),
    ...(count === undefined ? {} : { count }),
    ...(until === undefined ? {} : { until }),
  };
}

export function repeatOf(rule: RepeatRule): RepeatBody {
  const { byDay, ...rest } = rule;
  return { ...rest, ...(byDay === undefined ? {} : { byDay: [...byDay] }) };
}
