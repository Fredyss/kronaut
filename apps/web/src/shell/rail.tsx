import { cn } from '@kronaut/ui';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { m } from '../i18n.ts';
import { InboxBadge } from '../inbox/nav-link.tsx';
import { CalendarIcon, ChannelsIcon, InboxIcon, MediaIcon, SettingsIcon } from './icons.tsx';

const ITEM =
  'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-center font-medium text-[11px] text-muted-foreground leading-tight hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 md:w-full md:flex-none';
const ACTIVE = { className: 'bg-accent text-foreground' } as const;

interface RailLinkProps {
  readonly to: '/' | '/inbox' | '/media' | '/channels' | '/settings';
  readonly label: string;
  readonly icon: ReactNode;
  readonly badge?: ReactNode;
  readonly className?: string;
}

function RailLink({ to, label, icon, badge, className }: RailLinkProps) {
  return (
    <Link
      to={to}
      className={cn(ITEM, className)}
      activeProps={ACTIVE}
      activeOptions={{ exact: to === '/' }}
    >
      <span className="relative">
        {icon}
        {badge}
      </span>
      <span className="max-w-full break-words">{label}</span>
    </Link>
  );
}

export function Rail({ workspaceId }: { readonly workspaceId: string | undefined }) {
  const mark = Array.from(m.app_name())[0] ?? '';
  return (
    <nav
      aria-label={m.nav_label()}
      className="fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t bg-background px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:sticky md:top-0 md:h-svh md:w-20 md:shrink-0 md:flex-col md:items-center md:gap-2 md:border-t-0 md:border-r md:py-3"
    >
      <span className="mb-2 hidden size-9 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground md:flex">
        <span aria-hidden="true">{mark}</span>
        <span className="sr-only">{m.app_name()}</span>
      </span>
      <RailLink to="/" label={m.calendar_title()} icon={<CalendarIcon />} />
      <RailLink
        to="/inbox"
        label={m.nav_inbox()}
        icon={<InboxIcon />}
        badge={workspaceId === undefined ? null : <InboxBadge workspaceId={workspaceId} />}
      />
      <RailLink to="/media" label={m.nav_media()} icon={<MediaIcon />} />
      <RailLink to="/channels" label={m.nav_channels()} icon={<ChannelsIcon />} />
      <RailLink
        to="/settings"
        label={m.settings_title()}
        icon={<SettingsIcon />}
        className="md:mt-auto"
      />
    </nav>
  );
}
