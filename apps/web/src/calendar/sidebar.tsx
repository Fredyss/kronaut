import { buttonVariants, cn } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { type Channel, channelsQuery } from '../api.ts';
import { preloadEditor } from '../compose/load.ts';
import { useApiClient, useLocale } from '../context.ts';
import { m as calendarText } from '../i18n/calendar.ts';
import { m } from '../i18n.ts';
import { providerUi } from '../providers.ts';
import { statusLabel } from '../routes/channels.tsx';
import { ChevronsLeft, Plus } from './icons.tsx';

const STORAGE_KEY = 'kronaut.calendar.sidebar';
const EXPIRY_WARNING_HOURS = 7 * 24;

function storedCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

function storeCollapsed(collapsed: boolean): void {
  try {
    if (collapsed) localStorage.setItem(STORAGE_KEY, 'collapsed');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function channelHint(channel: Channel, locale: string): string | null {
  if (channel.status !== 'active') return statusLabel(channel.status);
  if (channel.accessExpiresAt === null) return null;
  const expires = Temporal.Instant.from(channel.accessExpiresAt);
  const soon = Temporal.Now.instant().add({ hours: EXPIRY_WARNING_HOURS });
  if (Temporal.Instant.compare(expires, soon) > 0) return null;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    expires.epochMilliseconds,
  );
  return m.channels_expires({ date });
}

function ChannelRow({ channel, locale }: { readonly channel: Channel; readonly locale: string }) {
  const provider = providerUi(channel.provider);
  const initial = Array.from(channel.displayName.trim())[0]?.toLocaleUpperCase(locale) ?? '?';
  const hint = channelHint(channel, locale);
  return (
    <Link
      to="/channels"
      className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span className="relative shrink-0" aria-hidden="true">
        <span className="flex size-8 items-center justify-center rounded-full bg-muted font-medium text-sm">
          {initial}
        </span>
        <span
          className={cn(
            'absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-background',
            provider.badge,
          )}
        />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm">{channel.displayName}</span>
        <span className="truncate text-muted-foreground text-xs">{provider.name()}</span>
        {hint === null ? null : <span className="truncate text-destructive text-xs">{hint}</span>}
      </span>
    </Link>
  );
}

function ChannelList({ workspaceId }: { readonly workspaceId: string }) {
  const client = useApiClient();
  const { locale } = useLocale();
  const channels = useQuery(channelsQuery(client, workspaceId)).data;
  if (channels === undefined) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-1.5 font-medium text-muted-foreground text-xs">{m.nav_channels()}</h2>
      {channels.length === 0 ? (
        <p className="px-1.5 text-muted-foreground text-sm">{m.channels_empty_title()}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {channels.map((channel) => (
            <li key={channel.id}>
              <ChannelRow channel={channel} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CalendarSidebar({ workspaceId }: { readonly workspaceId: string | undefined }) {
  const [collapsed, setCollapsed] = useState(storedCollapsed);
  const panelId = useId();
  const toggleLabel = collapsed
    ? calendarText.calendar_sidebar_expand()
    : calendarText.calendar_sidebar_collapse();
  const create = calendarText.calendar_create_post();
  return (
    <aside
      aria-label={m.nav_channels()}
      className={cn(
        'flex shrink-0 flex-col gap-3 border-b p-3 md:border-r md:border-b-0',
        collapsed ? 'md:w-14' : 'md:w-64',
      )}
    >
      <div className={cn('flex items-center gap-2', collapsed && 'md:flex-col')}>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={panelId}
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={() => {
            storeCollapsed(!collapsed);
            setCollapsed(!collapsed);
          }}
          className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'size-8' })}
        >
          <span
            className={cn(
              'flex transition-transform',
              collapsed ? '-rotate-90 md:rotate-180' : 'rotate-90 md:rotate-0',
            )}
          >
            <ChevronsLeft />
          </span>
        </button>
        <Link
          to="/compose"
          aria-label={collapsed ? create : undefined}
          title={collapsed ? create : undefined}
          onMouseEnter={preloadEditor}
          onFocus={preloadEditor}
          className={buttonVariants({
            size: collapsed ? 'icon' : 'default',
            className: collapsed ? 'size-8' : 'flex-1',
          })}
        >
          <Plus />
          {collapsed ? null : create}
        </Link>
      </div>
      <div id={panelId} hidden={collapsed} className="flex flex-col gap-3">
        <Link to="/channels" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          <Plus />
          {calendarText.calendar_add_channel()}
        </Link>
        {workspaceId === undefined ? null : <ChannelList workspaceId={workspaceId} />}
      </div>
    </aside>
  );
}
