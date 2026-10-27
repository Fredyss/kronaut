import { Link } from '@tanstack/react-router';
import type { NotificationItem } from '../api.ts';
import type { Formats } from '../calendar/formats.ts';
import { m } from '../i18n.ts';
import { reasonLabel } from '../inbox/reasons.ts';
import { notificationLine, notificationTarget } from './kinds.ts';

interface RowProps {
  readonly item: NotificationItem;
  readonly formats: Formats;
  onOpen(item: NotificationItem): void;
}

function Excerpt({ excerpt }: { readonly excerpt: string | null }) {
  if (excerpt === null) return null;
  return (
    <span className="line-clamp-2 break-words text-sm">
      {excerpt === '' ? m.calendar_untitled() : excerpt}
    </span>
  );
}

export function NotificationRow({ item, formats, onOpen }: RowProps) {
  const unread = item.readAt === null;
  return (
    <li>
      <Link
        {...notificationTarget(item)}
        onClick={() => onOpen(item)}
        className="flex gap-2 rounded-md p-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="mt-1.5 size-2 shrink-0">
          {unread ? (
            <>
              <span aria-hidden="true" className="block size-2 rounded-full bg-primary" />
              <span className="sr-only">{m.notifications_unread()}</span>
            </>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={unread ? 'font-medium' : undefined}>{notificationLine(item)}</span>
          {item.reason === null ? null : (
            <span className="text-muted-foreground text-sm">{reasonLabel(item.reason)}</span>
          )}
          <Excerpt excerpt={item.excerpt} />
          <time dateTime={item.createdAt} className="text-muted-foreground text-xs">
            {formats.stamp.format(new Date(item.createdAt))}
          </time>
        </span>
      </Link>
    </li>
  );
}
