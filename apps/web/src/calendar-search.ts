import { isPostId, type SlotSearch, slotSearch } from './compose-search.ts';

export const CALENDAR_VIEWS = ['day', 'week', 'month', 'list'] as const;

export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export interface CalendarSearch extends SlotSearch {
  readonly view?: CalendarView;
  readonly date?: string;
  readonly compose?: string;
}

const PLAIN_DATE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function isView(value: unknown): value is CalendarView {
  return CALENDAR_VIEWS.some((view) => view === value);
}

export function calendarSearch(search: Record<string, unknown>): CalendarSearch {
  const { view, date } = search;
  return {
    ...(isView(view) ? { view } : {}),
    ...(typeof date === 'string' && PLAIN_DATE.test(date) ? { date } : {}),
    ...(search.compose === 'new' ? { compose: 'new', ...slotSearch(search) } : {}),
    ...(isPostId(search.compose) ? { compose: search.compose } : {}),
  };
}
