import { cn } from '@kronaut/ui';
import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';
import type { Temporal } from 'temporal-polyfill';
import { m as calendarText } from '../i18n/calendar.ts';
import { m } from '../i18n.ts';
import { ChipList } from './chip.tsx';
import { DayMark } from './day-mark.tsx';
import { byHour, type Entry, slotKey } from './entries.ts';
import type { Formats } from './formats.ts';
import { CELL, DROP_OVER, type GridProps, PAST } from './grid.ts';
import { hourEnded, wallClock } from './time.ts';
import type { Mover } from './use-mover.ts';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const VISIBLE_CHIPS = 2;
const OPENING_HOUR = 7;

function useOpeningScroll(range: string, hour: number) {
  const scroller = useRef<HTMLDivElement>(null);
  const opened = useRef<string | null>(null);
  useEffect(() => {
    const area = scroller.current;
    if (area === null || opened.current === range) return;
    opened.current = range;
    const row = area.querySelector<HTMLElement>(`[data-hour="${hour}"]`);
    const head = area.querySelector('thead');
    if (row !== null) area.scrollTop = row.offsetTop - (head?.offsetHeight ?? 0);
  });
  return scroller;
}

function DayHeader({
  day,
  formats,
  today,
}: {
  readonly day: Temporal.PlainDate;
  readonly formats: Formats;
  readonly today: boolean;
}) {
  return (
    <th
      scope="col"
      aria-current={today ? 'date' : undefined}
      aria-label={day.toLocaleString(formats.locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })}
      className="sticky top-0 z-20 bg-background px-1.5 pt-1 pb-1.5 text-left font-normal"
    >
      <span className={cn('block text-xs', today ? 'text-foreground' : 'text-muted-foreground')}>
        {day.toLocaleString(formats.locale, { weekday: 'short' })}
      </span>
      <span className="text-lg">
        <DayMark label={day.toLocaleString(formats.locale, { day: 'numeric' })} today={today} />
      </span>
    </th>
  );
}

interface CellProps {
  readonly day: Temporal.PlainDate;
  readonly hour: number;
  readonly list: readonly Entry[];
  readonly past: boolean;
  readonly formats: Formats;
  readonly mover: Mover;
}

function HourCell({ day, hour, list, past, formats, mover }: CellProps) {
  const date = day.toString();
  const key = slotKey(date, hour);
  const label = formats.slot.format(wallClock(day, hour));
  const hidden = list.length - VISIBLE_CHIPS;
  return (
    <td aria-label={label} className="p-0.5 align-top">
      <div
        data-slot={key}
        className={cn(
          CELL,
          'relative isolate flex min-h-12 flex-col gap-1 p-1',
          past ? PAST : 'bg-card',
          mover.over === key && DROP_OVER,
        )}
        {...(past ? {} : mover.target(key))}
      >
        {past ? null : (
          <Link
            to="/compose"
            search={{ at: `${key}:00` }}
            aria-label={calendarText.calendar_new_post_at({ when: label })}
            className="absolute inset-0 rounded-md hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-ring"
          />
        )}
        <ChipList
          entries={list.slice(0, VISIBLE_CHIPS)}
          formats={formats}
          mover={mover}
          draggable
          compact
        />
        {hidden > 0 ? (
          <Link
            to="/"
            search={{ view: 'day', date }}
            className="relative z-10 self-start rounded px-1 text-muted-foreground text-xs hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {calendarText.calendar_more({ count: hidden })}
          </Link>
        ) : null}
      </div>
    </td>
  );
}

export function TimeGrid({ days, entries, formats, now, clock, mover }: GridProps) {
  const slots = useMemo(() => byHour(entries), [entries]);
  const first = days[0];
  const showsToday = days.some((day) => day.toString() === now);
  const opening = showsToday
    ? Math.max(clock.toZonedDateTimeISO(formats.timeZone).hour - 1, 0)
    : OPENING_HOUR;
  const scroller = useOpeningScroll(`${first?.toString()}/${days.length}`, opening);
  if (first === undefined) return null;
  return (
    <div
      ref={scroller}
      className="max-h-[calc(100svh-11rem)] min-h-80 overflow-auto rounded-lg border bg-background"
    >
      <table
        aria-label={m.calendar_title()}
        className={cn(
          'w-full table-fixed border-separate border-spacing-0',
          days.length > 1 && 'min-w-[56rem]',
        )}
      >
        <thead>
          <tr>
            <td className="sticky top-0 left-0 z-30 w-16 bg-background" />
            {days.map((day) => (
              <DayHeader
                key={day.toString()}
                day={day}
                formats={formats}
                today={day.toString() === now}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((hour) => (
            <tr key={hour} data-hour={hour}>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-background px-2 pt-1 text-right align-top font-normal text-muted-foreground text-xs tabular-nums"
              >
                {formats.hour.format(wallClock(first, hour))}
              </th>
              {days.map((day) => (
                <HourCell
                  key={day.toString()}
                  day={day}
                  hour={hour}
                  list={slots.get(slotKey(day.toString(), hour)) ?? []}
                  past={hourEnded(day, hour, formats.timeZone, clock)}
                  formats={formats}
                  mover={mover}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
