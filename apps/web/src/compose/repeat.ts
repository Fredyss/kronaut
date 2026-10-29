import { useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { type Repeat, WEEKDAYS, type Weekday } from '../series/rule-text.ts';
import { issueMessage } from './issues.ts';

export const REPEAT_ROLES: ReadonlySet<string> = new Set(['owner', 'admin', 'editor']);

export type Freq = Repeat['freq'] | 'none';
export type End = 'never' | 'until' | 'count';

const DUPLICATE_WINDOW_DAYS = 7;

function useRepeat() {
  const [freq, setFreq] = useState<Freq>('none');
  const [every, setEvery] = useState('1');
  const [days, setDays] = useState<readonly Weekday[]>([]);
  const [monthDay, setMonthDay] = useState('');
  const [end, setEnd] = useState<End>('never');
  const [until, setUntil] = useState('');
  const [count, setCount] = useState('');
  const toggle = (day: Weekday) =>
    setDays((list) => (list.includes(day) ? list.filter((d) => d !== day) : [...list, day]));
  return {
    ...{ freq, setFreq, every, setEvery, days, toggle, monthDay, setMonthDay },
    ...{ end, setEnd, until, setUntil, count, setCount },
  };
}

export type RepeatState = ReturnType<typeof useRepeat>;

function whole(text: string, max: number): number | null {
  const value = Number(text);
  return Number.isInteger(value) && value >= 1 && value <= max ? value : null;
}

function dateOf(text: string): Temporal.PlainDate | null {
  try {
    return Temporal.PlainDate.from(text);
  } catch {
    return null;
  }
}

function shape(state: RepeatState, start: Temporal.PlainDate): Partial<Repeat> | null {
  if (state.freq === 'weekly') {
    const fallback = WEEKDAYS[start.dayOfWeek - 1];
    const byDay = state.days.length > 0 ? state.days : fallback === undefined ? [] : [fallback];
    return { byDay: WEEKDAYS.filter((d) => byDay.includes(d)) };
  }
  if (state.freq !== 'monthly') return {};
  const day = state.monthDay === '' ? start.day : whole(state.monthDay, 31);
  return day === null ? null : { byMonthDay: day };
}

function ending(state: RepeatState, start: Temporal.PlainDate): Partial<Repeat> | null {
  if (state.end === 'count') {
    const count = whole(state.count, 500);
    return count === null ? null : { count };
  }
  if (state.end !== 'until') return {};
  const until = dateOf(state.until);
  if (until === null || Temporal.PlainDate.compare(until, start) < 0) return null;
  return { until: until.toString() };
}

export type RepeatResult = { readonly repeat: Repeat | undefined } | { readonly problem: string };

export function repeatOf(state: RepeatState, date: string): RepeatResult {
  const start = dateOf(date);
  if (state.freq === 'none' || start === null) return { repeat: undefined };
  const interval = whole(state.every, 99);
  const days = shape(state, start);
  const end = ending(state, start);
  if (interval === null || days === null || end === null) {
    return { problem: issueMessage('invalid_repeat') };
  }
  return { repeat: { freq: state.freq, ...(interval > 1 ? { interval } : {}), ...days, ...end } };
}

export function repeatsOften(repeat: Repeat | undefined): boolean {
  if (repeat === undefined || repeat.freq === 'monthly') return false;
  const interval = repeat.interval ?? 1;
  if (repeat.freq === 'daily') return interval < DUPLICATE_WINDOW_DAYS;
  return interval === 1 && (repeat.byDay?.length ?? 0) > 1;
}

export function useRepeatControl(date: string) {
  const state = useRepeat();
  const preview = repeatOf(state, date);
  const often = 'repeat' in preview && repeatsOften(preview.repeat);
  return { state, preview, often };
}

export type RepeatControl = ReturnType<typeof useRepeatControl>;
