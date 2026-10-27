import { Button } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { type NotificationItem, type NotificationList, notificationsQuery } from '../api.ts';
import { useFormats } from '../calendar/formats.ts';
import { browserTimeZone } from '../calendar/time.ts';
import { useApiClient, useLocale } from '../context.ts';
import { m } from '../i18n.ts';
import { useMarkRead } from './mark-read.ts';
import { NotificationRow } from './row.tsx';

interface PanelProps {
  readonly workspaceId: string;
  onDone(): void;
}

function Items({ workspaceId, list, onDone }: PanelProps & { readonly list: NotificationList }) {
  const { locale } = useLocale();
  const [timeZone] = useState(browserTimeZone);
  const formats = useFormats(locale, timeZone);
  const markRead = useMarkRead(workspaceId);
  if (list.items.length === 0) {
    return <p className="text-muted-foreground text-sm">{m.notifications_empty()}</p>;
  }
  const open = (item: NotificationItem) => {
    if (item.readAt === null) markRead.mutate({ ids: [item.id] });
    onDone();
  };
  const shownUnread = list.items.filter((item) => item.readAt === null).length;
  return (
    <>
      <ul className="-mx-1 flex flex-col gap-1">
        {list.items.map((item) => (
          <NotificationRow key={item.id} item={item} formats={formats} onOpen={open} />
        ))}
      </ul>
      {list.unread > shownUnread ? (
        <Link to="/inbox" onClick={onDone} className="text-sm underline underline-offset-4">
          {m.notifications_older()}
        </Link>
      ) : null}
    </>
  );
}

function MarkAll({
  workspaceId,
  list,
}: Omit<PanelProps, 'onDone'> & { readonly list: NotificationList }) {
  const markRead = useMarkRead(workspaceId);
  const newest = list.items[0];
  if (list.unread <= 0 || newest === undefined) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={markRead.isPending}
      onClick={() => markRead.mutate({ upTo: newest.id })}
    >
      {m.notifications_mark_all()}
    </Button>
  );
}

function Pending({ failed }: { readonly failed: boolean }) {
  return failed ? (
    <p role="alert" className="text-destructive text-sm">
      {m.inbox_load_failed()}
    </p>
  ) : (
    <p className="text-muted-foreground text-sm">{m.loading()}</p>
  );
}

export function NotificationsPanel({ workspaceId, onDone }: PanelProps) {
  const client = useApiClient();
  const list = useQuery(notificationsQuery(client, workspaceId));
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">{m.notifications_title()}</h2>
        {list.data === undefined ? null : <MarkAll workspaceId={workspaceId} list={list.data} />}
      </div>
      {list.data === undefined ? (
        <Pending failed={list.isError} />
      ) : (
        <Items workspaceId={workspaceId} list={list.data} onDone={onDone} />
      )}
    </>
  );
}
