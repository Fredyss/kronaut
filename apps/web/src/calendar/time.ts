import { Temporal } from 'temporal-polyfill';
import type { CalendarView } from '../calendar-search.ts';
import type { Locale } from '../i18n.ts';

const MONDAY = 1;
const MONTH_DAYS = 42;
const WEEK_DAYS = 7;

interface WeekInfoSource {
  getWeekInfo?(): { readonly firstDay?: number };
  readonly weekInfo?: { readonly firstDay?: number };
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function browserLanguage(): string | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.language;
}

export function firstDayOfWeek(locale: Locale, language: string | undefined): number {
  if (locale !== 'en' || language === undefined) return MONDAY;
  try {
    const tag = new Intl.Locale(language) as unknown as WeekInfoSource;
    const first = (tag.getWeekInfo?.() ?? tag.weekInfo)?.firstDay;
    return first !== undefined && first >= 1 && first <= 7 ? first : MONDAY;
  } catch {
    return MONDAY;
  }
}

export function parseDate(value: string | undefined): Temporal.PlainDate | null {
  if (value === undefined) return null;
  try {
    return Temporal.PlainDate.from(value, { overflow: 'reject' });
  } catch {
    return null;
  }
}

function startOfWeek(date: Temporal.PlainDate, firstDay: number): Temporal.PlainDate {
  return date.subtract({ days: (date.dayOfWeek - firstDay + WEEK_DAYS) % WEEK_DAYS });
}

export function boundary(date: Temporal.PlainDate, timeZone: string): Temporal.Instant {
  return date.toZonedDateTime({ timeZone }).toInstant();
}

export interface VisibleRange {
  readonly days: readonly Temporal.PlainDate[];
  readonly from: string;
  readonly to: string;
}

export function visibleRange(
  view: CalendarView,
  date: Temporal.PlainDate,
  firstDay: number,
  timeZone: string,
): VisibleRange {
  const month = view === 'month';
  const start = view === 'day' ? date : startOfWeek(month ? date.with({ day: 1 }) : date, firstDay);
  const count = month ? MONTH_DAYS : view === 'day' ? 1 : WEEK_DAYS;
  const days = Array.from({ length: count }, (_, index) => start.add({ days: index }));
  return {
    days,
    from: boundary(start, timeZone).toString(),
    to: boundary(start.add({ days: count }), timeZone).toString(),
  };
}

export function shift(
  view: CalendarView,
  date: Temporal.PlainDate,
  direction: 1 | -1,
): Temporal.PlainDate {
  if (view === 'month') return date.with({ day: 1 }).add({ months: direction });
  return date.add({ days: view === 'day' ? direction : WEEK_DAYS * direction });
}

export function dayOf(instant: string, timeZone: string): string {
  return Temporal.Instant.from(instant).toZonedDateTimeISO(timeZone).toPlainDate().toString();
}

export function today(timeZone: string): Temporal.PlainDate {
  return Temporal.Now.plainDateISO(timeZone);
}

export function currentInstant(): Temporal.Instant {
  return Temporal.Now.instant();
}

export function hourEnded(
  day: Temporal.PlainDate,
  hour: number,
  timeZone: string,
  now: Temporal.Instant,
): boolean {
  const end = day.toPlainDateTime({ hour }).add({ hours: 1 }).toZonedDateTime(timeZone);
  return Temporal.Instant.compare(end.toInstant(), now) <= 0;
}

// Grid labels name wall time, which a DST change can skip in the viewer's zone, so they are formatted in UTC.
export function wallClock(day: Temporal.PlainDate, hour: number): Date {
  return new Date(day.toPlainDateTime({ hour }).toZonedDateTime('UTC').epochMilliseconds);
}
