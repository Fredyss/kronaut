import { useLocale } from './context.ts';

const STYLE = { dateStyle: 'medium', timeStyle: 'short' } as const;

export function useFormat(timeZone: string | null) {
  const { locale } = useLocale();
  const format = new Intl.DateTimeFormat(locale, {
    ...STYLE,
    ...(timeZone === null ? {} : { timeZone }),
  });
  return (iso: string) => format.format(new Date(iso));
}

export function useWallFormat() {
  const { locale } = useLocale();
  const format = new Intl.DateTimeFormat(locale, { ...STYLE, timeZone: 'UTC' });
  return (local: string) => format.format(new Date(`${local}Z`));
}

export function useDateFormat() {
  const { locale } = useLocale();
  const format = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
  return (date: string) => format.format(new Date(`${date}T00:00:00Z`));
}

export function usePercentFormat() {
  const { locale } = useLocale();
  const format = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 });
  return (pct: number) => format.format(pct / 100);
}

export function useNumberFormat() {
  const { locale } = useLocale();
  const format = new Intl.NumberFormat(locale);
  return (value: number) => format.format(value);
}

const A_MONDAY = Date.UTC(2024, 0, 1);
const DAY_MS = 86_400_000;

export function useWeekdayFormat() {
  const { locale } = useLocale();
  const format = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  return (isoWeekday: number) => format.format(new Date(A_MONDAY + (isoWeekday - 1) * DAY_MS));
}
