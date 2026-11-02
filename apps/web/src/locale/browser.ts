import type { Locale } from './i18n.ts';

const MONDAY = 1;

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
