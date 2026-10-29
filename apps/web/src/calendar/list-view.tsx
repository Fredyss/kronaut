import { m as calendarText } from '../i18n/calendar.ts';
import { ChipList } from './chip.tsx';
import type { GridProps } from './grid.ts';

export function ListView({ days, entries, formats, now, mover }: GridProps) {
  return (
    <ol className="flex flex-col gap-4">
      {days.map((day) => {
        const key = day.toString();
        const list = entries.get(key) ?? [];
        return (
          <li
            key={key}
            aria-current={key === now ? 'date' : undefined}
            className="flex flex-col gap-2"
          >
            <h2 className="border-b pb-1 font-medium text-sm">
              {day.toLocaleString(formats.locale, { dateStyle: 'full' })}
            </h2>
            {list.length === 0 ? (
              <p className="text-muted-foreground text-sm">{calendarText.calendar_day_empty()}</p>
            ) : (
              <ChipList entries={list} formats={formats} mover={mover} draggable={false} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
