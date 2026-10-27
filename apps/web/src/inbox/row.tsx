import { buttonVariants } from '@kronaut/ui';
import { Link } from '@tanstack/react-router';
import { useId } from 'react';
import type { NeedsActionItem } from '../api.ts';
import type { Formats } from '../calendar/formats.ts';
import { httpsUrl, stateLabel } from '../destinations.ts';
import { m } from '../i18n.ts';
import { providerUi } from '../providers.ts';
import { RECONNECT, reasonLabel } from './reasons.ts';
import { RowActions } from './row-actions.tsx';

interface RowProps {
  readonly workspaceId: string;
  readonly item: NeedsActionItem;
  readonly formats: Formats;
}

function Channel({ item }: { readonly item: NeedsActionItem }) {
  return (
    <p className="flex min-w-0 flex-wrap gap-x-2 text-sm">
      <span className="text-muted-foreground">{providerUi(item.provider).name()}</span>
      <span className="truncate font-medium">{item.accountLabel}</span>
      {item.accountHandle === null ? null : (
        <span className="truncate text-muted-foreground">{item.accountHandle}</span>
      )}
    </p>
  );
}

function Status({ item, formats }: Omit<RowProps, 'workspaceId'>) {
  const link = httpsUrl(item.remoteUrl);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
        {stateLabel(item.state)}
      </span>
      {item.reason === null ? null : <span>{reasonLabel(item.reason)}</span>}
      {item.scheduledAt === null ? null : (
        <time dateTime={item.scheduledAt} className="text-muted-foreground">
          {m.post_scheduled_at({ when: formats.stamp.format(new Date(item.scheduledAt)) })}
        </time>
      )}
      {link === null ? null : (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          {m.post_view()}
        </a>
      )}
    </div>
  );
}

export function InboxRow({ workspaceId, item, formats }: RowProps) {
  const headingId = useId();
  const reconnect = item.state === 'blocked' && item.reason !== null && RECONNECT.has(item.reason);
  return (
    <li className="flex flex-col gap-3 rounded-xl border p-4">
      <h2 id={headingId} className="min-w-0 font-medium">
        <Link
          to="/posts/$postId"
          params={{ postId: item.postId }}
          className="line-clamp-2 break-words underline-offset-4 hover:underline"
        >
          {item.excerpt === '' ? m.calendar_untitled() : item.excerpt}
        </Link>
      </h2>
      <Channel item={item} />
      <Status item={item} formats={formats} />
      {reconnect ? (
        <Link to="/channels" className={buttonVariants({ size: 'sm', className: 'self-start' })}>
          {m.inbox_reconnect()}
        </Link>
      ) : null}
      <RowActions workspaceId={workspaceId} item={item} describedBy={headingId} />
    </li>
  );
}
