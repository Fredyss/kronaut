import { Button, ConfirmDelete, focusNeighbour } from '@kronaut/ui';
import { useRef, useState } from 'react';
import { useFormat } from '../../base/locale/format.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { feedHost, type RssFeed } from './feeds.ts';
import { useFeedWrites } from './writes.ts';

function Details({ feed, channels }: { readonly feed: RssFeed; readonly channels: string }) {
  const when = useFormat(null);
  const mode =
    feed.mode === 'queue'
      ? settingsText.settings_feed_mode_queue()
      : settingsText.settings_feed_mode_draft();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
      <span className="truncate font-medium">{feed.name}</span>
      <span className="truncate text-muted-foreground">{feedHost(feed.url)}</span>
      <span className="text-muted-foreground">{channels}</span>
      <span className="text-muted-foreground">
        {mode} ·{' '}
        {feed.lastCheckedAt === null
          ? settingsText.settings_feed_never_checked()
          : settingsText.settings_feed_last_check({ time: when(feed.lastCheckedAt) })}
      </span>
      <span>
        {feed.state === 'active'
          ? settingsText.settings_feed_active()
          : settingsText.settings_feed_paused({ reason: feed.pausedReason ?? 'manual' })}
      </span>
      {feed.lastError === null ? null : (
        <span className="text-destructive">
          {settingsText.settings_feed_last_error({ kind: feed.lastError })}
        </span>
      )}
    </div>
  );
}

export function FeedRow({
  workspaceId,
  feed,
  channels,
  onEdit,
}: {
  readonly workspaceId: string;
  readonly feed: RssFeed;
  readonly channels: string;
  onEdit(): void;
}) {
  const row = useRef<HTMLLIElement>(null);
  const { pause, remove } = useFeedWrites(workspaceId, feed.id, () => focusNeighbour(row.current));
  const [asking, setAsking] = useState(false);
  const close = () => setAsking(false);
  const { name } = feed;
  const active = feed.state === 'active';
  return (
    <li ref={row} className="flex flex-wrap items-center gap-3 px-6 py-3">
      <Details feed={feed} channels={channels} />
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={settingsText.settings_feed_edit_named({ name })}
        onClick={onEdit}
      >
        {settingsText.settings_feed_edit()}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={
          active
            ? settingsText.settings_feed_pause_named({ name })
            : settingsText.settings_feed_resume_named({ name })
        }
        disabled={pause.isPending}
        onClick={() => pause.mutate(active)}
      >
        {active ? settingsText.settings_feed_pause() : settingsText.settings_feed_resume()}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={settingsText.settings_feed_delete({ name })}
        onClick={() => setAsking(true)}
      >
        {settingsText.settings_feed_delete_confirm()}
      </Button>
      {asking ? (
        <ConfirmDelete
          title={settingsText.settings_feed_delete_title({ name })}
          body={settingsText.settings_feed_delete_body()}
          keepLabel={settingsText.settings_feed_keep()}
          confirmLabel={settingsText.settings_feed_delete_confirm()}
          pending={remove.isPending}
          onCancel={close}
          onConfirm={() => remove.mutate(undefined, { onSettled: close })}
        />
      ) : null}
    </li>
  );
}
