import { cn } from '@kronaut/ui';
import { Link } from '@tanstack/react-router';
import { Temporal } from 'temporal-polyfill';
import { m as calendarText } from '../i18n/calendar.ts';
import { ChipList } from './chip.tsx';
import { DayMark } from './day-mark.tsx';
import { keptTag } from './entries.ts';
import { CELL, DROP_OVER, type GridProps, PAST } from './grid.ts';

const MONTH_CHIPS = 3;

export function MonthGrid({ days, entries, formats, current, now, mover }: GridProps) {
  const today = Temporal.PlainDate.from(now);
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[44rem] grid-cols-7 gap-1" aria-hidden="true">
        {days.slice(0, 7).map((day) => (
          <span key={day.toString()} className="px-2 pb-1 text-muted-foreground text-xs">
            {day.toLocaleString(formats.locale, { weekday: 'short' })}
          </span>
        ))}
      </div>
      <ol className="grid min-w-[44rem] grid-cols-7 gap-1">
        {days.map((day) => {
          const key = day.toString();
          const list = entries.get(key) ?? [];
          const hidden = list.length - MONTH_CHIPS;
          const inMonth = day.month === current.month;
          const past = Temporal.PlainDate.compare(day, today) < 0;
          return (
            <li
              key={key}
              aria-current={key === now ? 'date' : undefined}
              className={cn(
                CELL,
                'flex min-h-28 min-w-0 flex-col gap-1 p-1.5',
                past ? PAST : inMonth ? 'bg-card' : 'bg-muted/50',
                mover.over === key && DROP_OVER,
              )}
              {...mover.target(key)}
            >
              <h2
                aria-label={day.toLocaleString(formats.locale, { dateStyle: 'full' })}
                className="text-xs"
              >
                <DayMark
                  label={day.toLocaleString(formats.locale, { day: 'numeric' })}
                  today={key === now}
                />
              </h2>
              <ChipList
                entries={list.slice(0, MONTH_CHIPS)}
                formats={formats}
                mover={mover}
                draggable
              />
              {hidden > 0 ? (
                <Link
                  to="/"
                  search={(prev) => ({ view: 'week', date: key, ...keptTag(prev) })}
                  className="rounded px-1 text-muted-foreground text-xs hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {calendarText.calendar_more({ count: hidden })}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
