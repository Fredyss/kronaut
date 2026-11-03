import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useState } from 'react';
import { useApiClient } from '../api/client.ts';
import { meQuery } from '../api/me.ts';
import { browserLanguage, browserTimeZone, firstDayOfWeek } from '../locale/browser.ts';
import { useLocale } from '../locale/context.ts';
import { useFormats } from '../locale/formats.ts';
import { CalendarBody } from './body.tsx';
import { CalendarSidebar } from './sidebar.tsx';
import { currentInstant, parseDate, today, visibleRange } from './time.ts';
import { CalendarToolbar } from './toolbar.tsx';

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
        <CalendarToolbar
          view={view}
          current={current}
          range={range}
          formats={formats}
          workspaceId={workspace?.id}
          role={workspace?.role}
          tag={search.tag}
        />
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
            tag={search.tag}
          />
        )}
      </section>
    </div>
  );
}
