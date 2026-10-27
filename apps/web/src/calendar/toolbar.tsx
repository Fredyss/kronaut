import { buttonVariants, cn } from '@kronaut/ui';
import { getRouteApi, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { Temporal } from 'temporal-polyfill';
import type { CalendarView } from '../calendar-search.ts';
import { m } from '../i18n.ts';
import type { Formats } from './formats.ts';
import { ChevronLeft, ChevronRight, GridIcon, ListIcon } from './icons.tsx';
import { boundary, shift, type VisibleRange } from './time.ts';

const route = getRouteApi('/app/');

const GRID_VIEWS = ['day', 'week', 'month'] as const;

type GridView = (typeof GRID_VIEWS)[number];

function viewLabel(view: GridView): string {
  switch (view) {
    case 'day':
      return m.calendar_view_day();
    case 'week':
      return m.calendar_view_week();
    case 'month':
      return m.calendar_view_month();
  }
}

function rangeLabel(
  view: CalendarView,
  current: Temporal.PlainDate,
  range: VisibleRange,
  formats: Formats,
): string {
  const at = (day: Temporal.PlainDate) =>
    new Date(boundary(day, formats.timeZone).epochMilliseconds);
  const options = { year: 'numeric', month: 'long', timeZone: formats.timeZone } as const;
  if (view === 'month') {
    const first = current.with({ day: 1 });
    const format = new Intl.DateTimeFormat(formats.locale, options);
    return format.formatRange(at(first), at(first.add({ months: 1 }).subtract({ days: 1 })));
  }
  if (view === 'day') {
    return new Intl.DateTimeFormat(formats.locale, {
      ...options,
      weekday: 'long',
      day: 'numeric',
    }).format(at(current));
  }
  const format = new Intl.DateTimeFormat(formats.locale, { ...options, day: 'numeric' });
  const first = range.days[0] ?? current;
  return format.formatRange(at(first), at(range.days.at(-1) ?? first));
}

function stepLabels(view: CalendarView): readonly [string, string] {
  if (view === 'day') return [m.calendar_previous_day(), m.calendar_next_day()];
  if (view === 'month') return [m.calendar_previous_month(), m.calendar_next_month()];
  return [m.calendar_previous_week(), m.calendar_next_week()];
}

const ICON_BUTTON = buttonVariants({ variant: 'ghost', size: 'icon', className: 'size-8' });

interface Segment {
  readonly view: CalendarView;
  readonly label: string;
  readonly pressed: boolean;
  readonly icon?: ReactNode;
}

function Segmented({
  label,
  segments,
  onPick,
}: {
  readonly label: string;
  readonly segments: readonly Segment[];
  onPick(view: CalendarView): void;
}) {
  return (
    <fieldset className="inline-flex min-w-0 rounded-md border bg-muted p-0.5">
      <legend className="sr-only">{label}</legend>
      {segments.map((segment) => (
        <button
          key={segment.label}
          type="button"
          aria-pressed={segment.pressed}
          aria-label={segment.icon === undefined ? undefined : segment.label}
          title={segment.icon === undefined ? undefined : segment.label}
          onClick={() => onPick(segment.view)}
          className={cn(
            'inline-flex h-7 items-center rounded-sm px-2.5 text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
            segment.pressed
              ? 'bg-background font-medium text-foreground shadow-xs'
              : 'text-muted-foreground',
          )}
        >
          {segment.icon ?? segment.label}
        </button>
      ))}
    </fieldset>
  );
}

interface ToolbarProps {
  readonly view: CalendarView;
  readonly current: Temporal.PlainDate;
  readonly range: VisibleRange;
  readonly formats: Formats;
}

export function CalendarToolbar({ view, current, range, formats }: ToolbarProps) {
  const navigate = route.useNavigate();
  const date = current.toString();
  const pick = (next: CalendarView) => void navigate({ to: '/', search: { view: next, date } });
  const [previous, next] = stepLabels(view);
  const listed = view === 'list';
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="sr-only">{m.calendar_title()}</h1>
      <nav aria-label={m.calendar_navigation()} className="flex min-w-0 items-center gap-1">
        <Link
          to="/"
          search={{ view, date: shift(view, current, -1).toString() }}
          aria-label={previous}
          title={previous}
          className={ICON_BUTTON}
        >
          <ChevronLeft />
        </Link>
        <p className="min-w-0 px-1 text-center">
          <span className="block font-medium text-sm">
            {rangeLabel(view, current, range, formats)}
          </span>
          <span className="block text-muted-foreground text-xs">
            {m.calendar_time_zone({ tz: formats.timeZone })}
          </span>
        </p>
        <Link
          to="/"
          search={{ view, date: shift(view, current, 1).toString() }}
          aria-label={next}
          title={next}
          className={ICON_BUTTON}
        >
          <ChevronRight />
        </Link>
        <Link
          to="/"
          search={{ view }}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          {m.calendar_today()}
        </Link>
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label={m.calendar_views()}
          onPick={pick}
          segments={GRID_VIEWS.map((option) => ({
            view: option,
            label: viewLabel(option),
            pressed: option === view,
          }))}
        />
        <Segmented
          label={m.calendar_layout()}
          onPick={pick}
          segments={[
            {
              view: listed ? 'week' : view,
              label: m.calendar_layout_grid(),
              pressed: !listed,
              icon: <GridIcon />,
            },
            { view: 'list', label: m.calendar_view_list(), pressed: listed, icon: <ListIcon /> },
          ]}
        />
      </div>
    </header>
  );
}
