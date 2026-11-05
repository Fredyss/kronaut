import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import type { Temporal } from 'temporal-polyfill';
import { useApiClient } from '../../base/api/client.ts';
import type { Formats } from '../../base/locale/formats.ts';
import { m } from '../../base/locale/i18n.ts';
import { m as calendarText } from '../../i18n/calendar.ts';
import { pollDelay } from '../../records/posts/destinations.ts';
import {
  draftsQuery,
  type PostFilter,
  type PostList,
  type PostSummary,
  postsRangeQuery,
} from '../../records/posts/queries.ts';
import { MOVE_HINT_ID } from './chip.tsx';
import { Drafts } from './drafts.tsx';
import { EmptyState } from './empty-state.tsx';
import { byDay } from './entries.ts';
import { CalendarCompose, EntryActionsProvider } from './entry-actions.tsx';
import { ListView } from './list-view.tsx';
import { MonthGrid } from './month-view.tsx';
import type { CalendarView } from './search.ts';
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
  readonly role: string;
  readonly view: CalendarView;
  readonly range: VisibleRange;
  readonly current: Temporal.PlainDate;
  readonly now: string;
  readonly clock: Temporal.Instant;
  readonly formats: Formats;
  readonly filter: PostFilter;
}

export function CalendarBody(props: BodyProps) {
  const { workspaceId, role, view, range, formats } = props;
  const { mover, moves } = useMover({ workspaceId, view, range, timeZone: formats.timeZone });
  const moved = moves.moved;
  return (
    <EntryActionsProvider workspaceId={workspaceId} role={role}>
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
      <CalendarCompose workspaceId={workspaceId} role={role} />
    </EntryActionsProvider>
  );
}

function CalendarContent({
  workspaceId,
  role,
  view,
  range,
  current,
  now,
  clock,
  formats,
  filter,
  mover,
}: BodyProps & { readonly mover: Mover }) {
  const client = useApiClient();
  useEffect(() => mover.restoreFocus());
  const posts = useQuery({
    ...postsRangeQuery(client, workspaceId, range, filter),
    refetchInterval: (query) => calendarPollDelay(query.state.data?.items, Date.now()),
  });
  const drafts = useQuery(draftsQuery(client, workspaceId, filter));
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
  const nothing = posts.data.items.length === 0 && drafts.data?.items.length === 0;
  const filtered = [filter.tag, filter.brand, filter.group].some((id) => id !== undefined);
  if (view === 'list' && !filtered && nothing) {
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
      {view === 'list' ? <DraftsSection drafts={drafts} formats={formats} role={role} /> : null}
    </>
  );
}

function DraftsSection({
  drafts,
  formats,
  role,
}: {
  readonly drafts: UseQueryResult<PostList>;
  readonly formats: Formats;
  readonly role: string;
}) {
  if (drafts.data !== undefined) {
    return <Drafts items={drafts.data.items} formats={formats} role={role} />;
  }
  return drafts.isError ? (
    <p role="alert" className="text-destructive text-sm">
      {calendarText.calendar_load_failed()}
    </p>
  ) : null;
}
