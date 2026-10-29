import { Temporal } from 'temporal-polyfill';

export const WEEKDAYS = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'] as const;
export const REPEAT_FREQS = ['daily', 'weekly', 'monthly'] as const;
export const REPEAT_LIMITS = { interval: 99, count: 500, monthDay: 31 } as const;

export type Weekday = (typeof WEEKDAYS)[number];
export type RepeatFreq = (typeof REPEAT_FREQS)[number];

export interface RepeatRule {
  readonly freq: RepeatFreq;
  readonly interval?: number;
  readonly byDay?: readonly Weekday[];
  readonly byMonthDay?: number;
  readonly count?: number;
  readonly until?: string;
}

export interface RuleSeries {
  readonly rule: RepeatRule;
  readonly dtstart: Temporal.PlainDateTime;
}

export interface RulePosition {
  readonly index: number;
  readonly local: Temporal.PlainDateTime;
}

export class RuleError extends Error {
  readonly code = 'invalid_repeat';

  constructor(message: string) {
    super(message);
    this.name = 'RuleError';
  }
}

const KEYS = new Set(['FREQ', 'INTERVAL', 'BYDAY', 'BYMONTHDAY', 'COUNT', 'UNTIL']);
const NUMBER = /^[1-9]\d{0,2}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RULE_DATE = /^(\d{4})(\d{2})(\d{2})$/;
// A rule like "every 12 months on the 31st" from a 30-day month never matches; stop looking.
const MAX_PERIODS = 1200;

function fail(message: string): never {
  throw new RuleError(message);
}

function inRange(value: number | undefined, max: number): boolean {
  return value === undefined || (Number.isInteger(value) && value >= 1 && value <= max);
}

function checkUntil(until: string | undefined): void {
  if (until === undefined) return;
  if (!ISO_DATE.test(until)) fail('UNTIL must be a date');
  try {
    Temporal.PlainDate.from(until, { overflow: 'reject' });
  } catch {
    fail('UNTIL must be a date');
  }
}

function checkShape(rule: RepeatRule): void {
  const days = rule.byDay;
  if (rule.freq === 'weekly') {
    if (days === undefined || days.length === 0) fail('weekly needs BYDAY');
    if (new Set(days).size !== days.length || days.some((d) => !WEEKDAYS.includes(d))) {
      fail('BYDAY lists each weekday once');
    }
  } else if (days !== undefined) {
    fail('BYDAY is for weekly rules only');
  }
  if (rule.freq === 'monthly') {
    if (rule.byMonthDay === undefined) fail('monthly needs BYMONTHDAY');
  } else if (rule.byMonthDay !== undefined) {
    fail('BYMONTHDAY is for monthly rules only');
  }
}

export function checkRule(rule: RepeatRule): void {
  if (!REPEAT_FREQS.includes(rule.freq)) fail('unknown FREQ');
  checkShape(rule);
  if (!inRange(rule.interval, REPEAT_LIMITS.interval)) fail('INTERVAL is 1 to 99');
  if (!inRange(rule.byMonthDay, REPEAT_LIMITS.monthDay)) fail('BYMONTHDAY is 1 to 31');
  if (!inRange(rule.count, REPEAT_LIMITS.count)) fail('COUNT is 1 to 500');
  if (rule.count !== undefined && rule.until !== undefined) fail('COUNT or UNTIL, not both');
  checkUntil(rule.until);
}

function sortedDays(days: readonly Weekday[]): Weekday[] {
  return [...days].sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
}

export function formatRule(rule: RepeatRule): string {
  checkRule(rule);
  const parts = [`FREQ=${rule.freq.toUpperCase()}`];
  if (rule.interval !== undefined && rule.interval > 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.byDay !== undefined) parts.push(`BYDAY=${sortedDays(rule.byDay).join(',')}`);
  if (rule.byMonthDay !== undefined) parts.push(`BYMONTHDAY=${rule.byMonthDay}`);
  if (rule.count !== undefined) parts.push(`COUNT=${rule.count}`);
  if (rule.until !== undefined) parts.push(`UNTIL=${rule.until.replaceAll('-', '')}`);
  return parts.join(';').toUpperCase();
}

function fields(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of text.split(';')) {
    const [key, value, ...rest] = part.split('=');
    if (key === undefined || value === undefined || rest.length > 0 || !KEYS.has(key)) {
      fail('unsupported rule part');
    }
    if (map.has(key)) fail(`${key} repeats`);
    map.set(key, value);
  }
  return map;
}

function numberOf(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!NUMBER.test(value)) fail('not a number');
  return Number(value);
}

function freqOf(value: string | undefined): RepeatFreq {
  const freq = REPEAT_FREQS.find((f) => f.toUpperCase() === value);
  return freq ?? fail('unknown FREQ');
}

function daysOf(value: string | undefined): Weekday[] | undefined {
  if (value === undefined) return undefined;
  return value.split(',').map((d) => WEEKDAYS.find((w) => w.toUpperCase() === d) ?? fail('BYDAY'));
}

function untilOf(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const match = RULE_DATE.exec(value);
  return match === null ? fail('UNTIL must be YYYYMMDD') : `${match[1]}-${match[2]}-${match[3]}`;
}

export function parseRule(text: string): RepeatRule {
  const map = fields(text);
  const interval = numberOf(map.get('INTERVAL'));
  const byDay = daysOf(map.get('BYDAY'));
  const byMonthDay = numberOf(map.get('BYMONTHDAY'));
  const count = numberOf(map.get('COUNT'));
  const until = untilOf(map.get('UNTIL'));
  const rule: RepeatRule = {
    freq: freqOf(map.get('FREQ')),
    ...(interval === undefined || interval === 1 ? {} : { interval }),
    ...(byDay === undefined ? {} : { byDay: sortedDays(byDay) }),
    ...(byMonthDay === undefined ? {} : { byMonthDay }),
    ...(count === undefined ? {} : { count }),
    ...(until === undefined ? {} : { until }),
  };
  checkRule(rule);
  return rule;
}

type Candidates = (period: number) => Temporal.PlainDate[];

function dailyDates(start: Temporal.PlainDate, step: number): Candidates {
  return (period) => [start.add({ days: period * step })];
}

function weeklyDates(start: Temporal.PlainDate, step: number, days: readonly Weekday[]) {
  const monday = start.subtract({ days: start.dayOfWeek - 1 });
  const offsets = sortedDays(days).map((d) => WEEKDAYS.indexOf(d));
  return (period: number) =>
    offsets.map((offset) => monday.add({ days: period * step * 7 + offset }));
}

function monthlyDates(start: Temporal.PlainDate, step: number, day: number): Candidates {
  const first = start.toPlainYearMonth();
  return (period) => {
    const month = first.add({ months: period * step });
    return day > month.daysInMonth ? [] : [month.toPlainDate({ day })];
  };
}

function firstPeriod(rule: RepeatRule, start: Temporal.PlainDate, after: Temporal.PlainDate) {
  const step = rule.interval ?? 1;
  let elapsed: number;
  if (rule.freq === 'monthly') {
    const months = start
      .toPlainYearMonth()
      .until(after.toPlainYearMonth(), { largestUnit: 'months' });
    elapsed = months.months;
  } else {
    const monday = start.subtract({ days: rule.freq === 'weekly' ? start.dayOfWeek - 1 : 0 });
    elapsed = Math.floor(monday.until(after).days / (rule.freq === 'weekly' ? 7 : 1));
  }
  return Math.max(0, Math.floor(elapsed / step));
}

function candidates(rule: RepeatRule, start: Temporal.PlainDate): Candidates {
  const step = rule.interval ?? 1;
  if (rule.freq === 'weekly') return weeklyDates(start, step, rule.byDay ?? []);
  if (rule.freq === 'monthly') return monthlyDates(start, step, rule.byMonthDay ?? start.day);
  return dailyDates(start, step);
}

function firstAfter(
  { rule, dtstart }: RuleSeries,
  after: Temporal.PlainDateTime,
): Temporal.PlainDateTime | null {
  const start = dtstart.toPlainDate();
  const time = dtstart.toPlainTime();
  const datesIn = candidates(rule, start);
  const from = firstPeriod(rule, start, after.toPlainDate());
  for (let period = from; period < from + MAX_PERIODS; period++) {
    for (const date of datesIn(period)) {
      const local = date.toPlainDateTime(time);
      const later = Temporal.PlainDateTime.compare(local, after) > 0;
      if (later && Temporal.PlainDateTime.compare(local, dtstart) >= 0) return local;
    }
  }
  return null;
}

export function nextOccurrence(
  series: RuleSeries,
  after: RulePosition,
): Temporal.PlainDateTime | null {
  const { count, until } = series.rule;
  if (count !== undefined && after.index >= count) return null;
  const next = firstAfter(series, after.local);
  if (next === null) return null;
  if (until !== undefined && Temporal.PlainDate.compare(next.toPlainDate(), until) > 0) return null;
  return next;
}

export function occurrenceAt(series: RuleSeries, index: number): Temporal.PlainDateTime | null {
  let local: Temporal.PlainDateTime | null = series.dtstart;
  for (let at = 1; at < index && local !== null; at++) {
    local = nextOccurrence(series, { index: at, local });
  }
  return local;
}
