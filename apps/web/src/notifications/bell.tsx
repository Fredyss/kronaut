import { Button } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { lazyRouteComponent } from '@tanstack/react-router';
import { Suspense } from 'react';
import { notificationsQuery } from '../api.ts';
import { useApiClient } from '../context.ts';
import { CountBadge } from '../count-badge.tsx';
import { useDisclosure } from '../disclosure.ts';
import { m } from '../i18n.ts';

const Panel = lazyRouteComponent(() => import('./panel.tsx'), 'NotificationsPanel');

function preload(): void {
  void Panel.preload?.();
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function NotificationsBell({ workspaceId }: { readonly workspaceId: string }) {
  const client = useApiClient();
  const unread = useQuery({
    ...notificationsQuery(client, workspaceId),
    select: (data) => data.unread,
  }).data;
  const { open, toggle, close, root, button, panelId } = useDisclosure();
  return (
    <div ref={root} className="relative">
      <Button
        ref={button}
        variant="ghost"
        size="sm"
        aria-label={
          unread === undefined || unread <= 0
            ? m.notifications_title()
            : m.notifications_button({ count: unread })
        }
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        onMouseEnter={preload}
        onFocus={preload}
      >
        <BellIcon />
        <CountBadge count={unread} />
      </Button>
      {open ? (
        <div
          id={panelId}
          className="absolute right-0 z-40 mt-2 flex max-h-[70svh] w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto rounded-lg border bg-popover p-3 text-popover-foreground shadow-md"
        >
          <Suspense fallback={<p className="text-muted-foreground text-sm">{m.loading()}</p>}>
            <Panel workspaceId={workspaceId} onDone={close} />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
