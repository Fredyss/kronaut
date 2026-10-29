import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import type { Temporal } from 'temporal-polyfill';
import { draftsQuery, type PostSummary, postsRangeQuery } from '../api.ts';
import type { CalendarView } from '../calendar-search.ts';
import { useApiClient } from '../context.ts';
import { pollDelay } from '../destinations.ts';
import { m as calendarText } from '../i18n/calendar.ts';
import { m } from '../i18n.ts';
import { MOVE_HINT_ID } from './chip.tsx';
import { Drafts } from './drafts.tsx';
import { EmptyState } from './empty-state.tsx';
import { byDay } from './entries.ts';
import type { Formats } from './formats.ts';
import { ListView } from './list-view.tsx';
import { MonthGrid } from './month-view.tsx';
import type { VisibleRange } from './time.ts';
import { TimeGrid } from './time-grid.tsx';
import { UndoNotice } from './undo.tsx';
import { type Mover, useMover } from './use-mover.ts';

const CALENDAR_POLL_MS = 30_000;

type Summary = PostSummary;

function calendarPollDelay(items: readonly Summary[] | undefined, now: number): number | false {
  let soonest: number | false = false;
  for (const item of items ?? []) {
    const delay = pollDelay(item, now);
    if (delay !== false && (soonest === false || delay < soonest)) soonest = delay;
  }
  return soonest === false ? false : Math.max(soonest, CALENDAR_POLL_MS);
}

interface BodyProps {
  readonly workspaceId: string;
  readonly view: CalendarView;
  readonly range: VisibleRange;
  readonly current: Temporal.PlainDate;
  readonly now: string;
  readonly clock: Temporal.Instant;
  readonly formats: Formats;
}

export function CalendarBody(props: BodyProps) {
  const { workspaceId, view, range, formats } = props;
  const { mover, moves } = useMover({ workspaceId, view, range, timeZone: formats.timeZone });
  const moved = moves.moved;
  return (
    <>
      <CalendarContent {...props} mover={mover} />
      <p id={MOVE_HINT_ID} hidden>
        {calendarText.calendar_move_hint()}
      </p>
      <UndoNotice
        moved={moved}
        when={moved === null ? '' : formats.stamp.format(new Date(moved.at))}
        onUndo={moves.undo}
        onDismiss={moves.dismiss}
      />
    </>
  );
}

function CalendarContent({
  workspaceId,
  view,
  range,
  current,
  now,
  clock,
  formats,
  mover,
}: BodyProps & { readonly mover: Mover }) {
  const client = useApiClient();
  useEffect(() => mover.restoreFocus());
  const posts = useQuery({
    ...postsRangeQuery(client, workspaceId, range.from, range.to),
    refetchInterval: (query) => calendarPollDelay(query.state.data?.items, Date.now()),
  });
  const drafts = useQuery(draftsQuery(client, workspaceId));
  const items = posts.data?.items;
  const entries = useMemo(() => byDay(items ?? [], formats.timeZone), [items, formats.timeZone]);
  if (posts.data === undefined) {
    return posts.isError ? (
      <p role="alert" className="text-destructive text-sm">
        {calendarText.calendar_load_failed()}
      </p>
    ) : (
      <p className="text-muted-foreground text-sm">{m.loading()}</p>
    );
  }
  if (view === 'list' && posts.data.items.length === 0 && drafts.data?.items.length === 0) {
    return <EmptyState />;
  }
  const grid = { days: range.days, entries, formats, current, now, clock, mover };
  return (
    <>
      {posts.data.truncated ? (
        <p role="status" className="rounded-md border px-3 py-2 text-sm">
          {calendarText.calendar_truncated()}
        </p>
      ) : null}
      {view === 'month' ? (
        <MonthGrid {...grid} />
      ) : view === 'list' ? (
        <ListView {...grid} />
      ) : (
        <TimeGrid {...grid} />
      )}
      {view !== 'list' ? null : drafts.data === undefined ? (
        drafts.isError ? (
          <p role="alert" className="text-destructive text-sm">
            {calendarText.calendar_load_failed()}
          </p>
        ) : null
      ) : (
        <Drafts items={drafts.data.items} formats={formats} />
      )}
    </>
  );
}
