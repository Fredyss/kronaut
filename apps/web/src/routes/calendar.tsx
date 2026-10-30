import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useState } from 'react';
import { meQuery } from '../api.ts';
import { CalendarBody } from '../calendar/body.tsx';
import { useFormats } from '../calendar/formats.ts';
import { CalendarSidebar } from '../calendar/sidebar.tsx';
import {
  browserLanguage,
  browserTimeZone,
  currentInstant,
  firstDayOfWeek,
  parseDate,
  today,
  visibleRange,
} from '../calendar/time.ts';
import { CalendarToolbar } from '../calendar/toolbar.tsx';
import { useApiClient, useLocale } from '../context.ts';

const route = getRouteApi('/app/');

export function CalendarPage() {
  const client = useApiClient();
  const { locale } = useLocale();
  const search = route.useSearch();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  const [timeZone] = useState(browserTimeZone);
  const formats = useFormats(locale, timeZone);
  const view = search.view ?? 'week';
  const now = today(timeZone);
  const current = parseDate(search.date) ?? now;
  const firstDay = firstDayOfWeek(locale, browserLanguage());
  const range = visibleRange(view === 'list' ? 'week' : view, current, firstDay, timeZone);
  return (
    <div className="flex w-full flex-1 flex-col md:flex-row">
      <CalendarSidebar workspaceId={workspace?.id} />
      <section className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <CalendarToolbar view={view} current={current} range={range} formats={formats} />
        {workspace === undefined ? null : (
          <CalendarBody
            workspaceId={workspace.id}
            role={workspace.role}
            view={view}
            range={range}
            current={current}
            now={now.toString()}
            clock={currentInstant()}
            formats={formats}
          />
        )}
      </section>
    </div>
  );
}
