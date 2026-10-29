import type { PostsScheduleData } from '@kronaut/sdk';
import { useLocale } from '../context.ts';
import { useDateFormat, useWeekdayFormat } from '../format.ts';
import { m } from '../i18n.ts';

type InstantBody = Extract<PostsScheduleData['body'], { mode: 'instant' }>;
export type Repeat = NonNullable<InstantBody['repeat']>;
export type Weekday = NonNullable<Repeat['byDay']>[number];

export const WEEKDAYS: readonly Weekday[] = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];

export function useRuleText() {
  const { locale } = useLocale();
  const weekday = useWeekdayFormat();
  const date = useDateFormat();
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  return (repeat: Repeat): string[] => {
    const days = (repeat.byDay ?? []).map((d) => weekday(WEEKDAYS.indexOf(d) + 1));
    const rule = m.series_rule({
      freq: repeat.freq,
      count: repeat.interval ?? 1,
      days: list.format(days),
      day: repeat.byMonthDay ?? 1,
    });
    if (repeat.until !== undefined) return [rule, m.series_until({ date: date(repeat.until) })];
    if (repeat.count !== undefined) return [rule, m.series_count({ count: repeat.count })];
    return [rule];
  };
}
