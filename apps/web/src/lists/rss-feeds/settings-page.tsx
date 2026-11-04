import { Button, SettingsCard, SettingsPage } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { meQuery } from '../../base/api/me.ts';
import { useLocale } from '../../base/locale/context.ts';
import { m } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { channelsQuery } from '../../records/channels/queries.ts';
import { FeedDialog } from './feed-dialog.tsx';
import { FeedRow } from './feed-row.tsx';
import { type RssFeed, rssFeedsQuery } from './feeds.ts';

const EDITORS: ReadonlySet<string> = new Set(['owner', 'admin']);

function useChannelNames(workspaceId: string) {
  const client = useApiClient();
  const { locale } = useLocale();
  const channels = useQuery(channelsQuery(client, workspaceId)).data ?? [];
  const names = new Map(channels.map((channel) => [channel.id, channel.displayName]));
  const list = new Intl.ListFormat(locale);
  return (ids: readonly string[]) => list.format(ids.flatMap((id) => names.get(id) ?? []));
}

function FeedList({ workspaceId }: { readonly workspaceId: string }) {
  const client = useApiClient();
  const feeds = useQuery(rssFeedsQuery(client, workspaceId));
  const channelNames = useChannelNames(workspaceId);
  const [editing, setEditing] = useState<RssFeed | 'new' | null>(null);
  if (feeds.data === undefined) {
    return feeds.isError ? (
      <p role="alert" className="text-destructive text-sm">
        {m.error_generic()}
      </p>
    ) : (
      <p className="text-muted-foreground text-sm">{m.loading()}</p>
    );
  }
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => setEditing('new')}
      >
        {settingsText.settings_feed_add()}
      </Button>
      {feeds.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">{settingsText.settings_feeds_empty()}</p>
      ) : (
        <SettingsCard title={settingsText.settings_feeds_title()}>
          <ul className="flex flex-col divide-y">
            {feeds.data.map((feed) => (
              <FeedRow
                key={feed.id}
                workspaceId={workspaceId}
                feed={feed}
                channels={channelNames(feed.channelIds)}
                onEdit={() => setEditing(feed)}
              />
            ))}
          </ul>
        </SettingsCard>
      )}
      {editing === null ? null : (
        <FeedDialog
          workspaceId={workspaceId}
          feed={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

export function FeedSettingsPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <SettingsPage
      title={settingsText.settings_feeds_title()}
      intro={settingsText.settings_feeds_intro()}
    >
      <div tabIndex={-1} className="flex flex-col gap-6 outline-none">
        {workspace === undefined ? null : EDITORS.has(workspace.role) ? (
          <FeedList workspaceId={workspace.id} />
        ) : (
          <p className="text-muted-foreground text-sm">{settingsText.settings_read_only()}</p>
        )}
      </div>
    </SettingsPage>
  );
}
