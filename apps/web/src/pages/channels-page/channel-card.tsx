import { Button } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { useLocale } from '../../base/locale/context.ts';
import { m } from '../../base/locale/i18n.ts';
import { providerUi } from '../../base/providers/ui.ts';
import { ChannelSignature } from '../../content/saved-texts/channel-signature.tsx';
import { ChannelShortenLinks } from '../../content/short-links/channel-switch.tsx';
import { brandsQuery, groupByBrand } from '../../records/brands/queries.ts';
import { DisconnectConfirm } from '../../records/channels/disconnect.tsx';
import type { Channel } from '../../records/channels/queries.ts';
import { statusLabel } from '../../records/channels/status-label.ts';
import { httpsUrl } from '../../records/posts/destinations.ts';
import { ChannelBrand } from './channel-brand.tsx';

const Followers = lazy(() =>
  import('../../records/channels/followers.tsx').then((module) => ({ default: module.Followers })),
);

const QueueEditor = lazy(() =>
  import('../../records/channels/queue-editor.tsx').then((module) => ({
    default: module.QueueEditor,
  })),
);

interface CardProps {
  readonly channel: Channel;
  readonly onReconnect: (() => void) | null;
  readonly onDisconnect: (() => void) | null;
  readonly pending: boolean;
  readonly disconnecting: boolean;
  readonly queueWorkspace: string | null;
  readonly metricsWorkspace: string | null;
  readonly onAddInsights: (() => void) | null;
}

type Panel = 'confirm' | 'queue' | null;

interface ActionProps extends CardProps {
  readonly panel: Panel;
  setPanel(panel: Panel): void;
}

function CardActions({ channel, onReconnect, onDisconnect, pending, ...rest }: ActionProps) {
  const { panel, setPanel, queueWorkspace } = rest;
  const healthy = channel.status === 'active';
  return (
    <div className="flex flex-col items-end gap-2">
      <span
        className={
          healthy
            ? 'rounded-full bg-secondary px-2 py-0.5 text-xs'
            : 'rounded-full bg-destructive/10 px-2 py-0.5 text-destructive text-xs'
        }
      >
        {statusLabel(channel.status)}
      </span>
      {onReconnect === null ? null : (
        <Button size="sm" variant="outline" disabled={pending} onClick={onReconnect}>
          {m.channels_reconnect()}
        </Button>
      )}
      {queueWorkspace === null || panel !== null ? null : (
        <Button size="sm" variant="ghost" onClick={() => setPanel('queue')}>
          {m.channels_queue()}
        </Button>
      )}
      {onDisconnect === null || panel !== null ? null : (
        <Button size="sm" variant="ghost" onClick={() => setPanel('confirm')}>
          {m.channels_disconnect()}
        </Button>
      )}
    </div>
  );
}

function ChannelCard(props: CardProps) {
  const { channel, onDisconnect, disconnecting, queueWorkspace, metricsWorkspace } = props;
  const { onAddInsights } = props;
  const { locale } = useLocale();
  const [panel, setPanel] = useState<Panel>(null);
  const profile = httpsUrl(channel.profileUrl);
  const expires =
    channel.accessExpiresAt === null
      ? null
      : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
          new Date(channel.accessExpiresAt),
        );
  return (
    <li className="flex flex-wrap items-start gap-3 rounded-xl border p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-muted-foreground text-xs">{providerUi(channel.provider).name()}</span>
        <span className="truncate font-medium">{channel.displayName}</span>
        {channel.handle === null ? null : (
          <span className="truncate text-muted-foreground text-sm">{channel.handle}</span>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {profile === null ? null : (
            <a
              href={profile}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {m.channels_open_profile()}
            </a>
          )}
          {expires === null ? null : (
            <span className="text-muted-foreground">{m.channels_expires({ date: expires })}</span>
          )}
          {metricsWorkspace === null ? null : (
            <Suspense fallback={null}>
              <Followers
                workspaceId={metricsWorkspace}
                channel={channel}
                onReconnect={onAddInsights}
                pending={props.pending}
              />
            </Suspense>
          )}
        </div>
        <ChannelSignature channel={channel} />
        <ChannelShortenLinks channel={channel} />
        <ChannelBrand channel={channel} />
      </div>
      <CardActions {...props} panel={panel} setPanel={setPanel} />
      {onDisconnect === null || panel !== 'confirm' ? null : (
        <DisconnectConfirm
          name={channel.displayName}
          pending={disconnecting}
          onConfirm={onDisconnect}
          onClose={() => setPanel(null)}
        />
      )}
      {queueWorkspace === null || panel !== 'queue' ? null : (
        <Suspense fallback={null}>
          <QueueEditor
            workspaceId={queueWorkspace}
            channel={channel}
            onClose={() => setPanel(null)}
          />
        </Suspense>
      )}
    </li>
  );
}

interface ChannelListProps {
  readonly channels: readonly Channel[];
  readonly workspaceId: string;
  cardFor(channel: Channel): CardProps;
}

function Cards({ channels, cardFor }: Omit<ChannelListProps, 'workspaceId'>) {
  return (
    <ul className="flex flex-col gap-3">
      {channels.map((channel) => (
        <ChannelCard key={channel.id} {...cardFor(channel)} />
      ))}
    </ul>
  );
}

export function ChannelList({ channels, workspaceId, cardFor }: ChannelListProps) {
  const client = useApiClient();
  const brands = useQuery(brandsQuery(client, workspaceId)).data;
  if (brands === undefined || brands.length === 0) {
    return <Cards channels={channels} cardFor={cardFor} />;
  }
  return (
    <div className="flex flex-col gap-6">
      {groupByBrand(channels, brands).map(({ brand, items }) => (
        <section key={brand?.id ?? ''} className="flex flex-col gap-3">
          <h2 className="font-medium text-muted-foreground text-sm">
            {brand === null ? m.brand_none() : brand.name}
          </h2>
          <Cards channels={items} cardFor={cardFor} />
        </section>
      ))}
    </div>
  );
}
