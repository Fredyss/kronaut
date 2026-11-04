import { Button, Input, Label, Modal } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { m } from '../../base/locale/i18n.ts';
import { choiceFor, NO_MEDIA } from '../../composer/compose/content/choice.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { type Channel, channelsQuery } from '../../records/channels/queries.ts';
import { type FeedErrors, feedErrors } from './errors.ts';
import { ChannelChoices, FieldError, ModeChoice, TemplateField } from './feed-fields.tsx';
import {
  DEFAULT_TEMPLATE,
  FEED_NAME_MAX,
  FEED_URL_MAX,
  type FeedMode,
  type RssFeed,
} from './feeds.ts';
import { type FeedBody, useSaveFeed } from './writes.ts';

const NO_ERRORS: FeedErrors = { channels: [] };

function useChoosable(workspaceId: string, initial: ReadonlySet<string>) {
  const client = useApiClient();
  const channels = useQuery(channelsQuery(client, workspaceId)).data;
  return useMemo(
    () =>
      (channels ?? []).filter(
        (channel) => initial.has(channel.id) || choiceFor(channel, NO_MEDIA).kind === 'ok',
      ),
    [channels, initial],
  );
}

function bodyOf(draft: FeedBody, order: readonly Channel[]): FeedBody {
  const picked = new Set(draft.channelIds);
  return {
    ...draft,
    url: draft.url.trim(),
    name: draft.name.normalize('NFC').trim(),
    channelIds: order.filter((channel) => picked.has(channel.id)).map((channel) => channel.id),
  };
}

function TextField({
  label,
  value,
  max,
  error,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly max: number;
  readonly error?: string | undefined;
  onChange(value: string): void;
}) {
  const id = useId();
  const errorId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        maxLength={max}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={error === undefined ? undefined : errorId}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export interface FeedDialogProps {
  readonly workspaceId: string;
  readonly feed: RssFeed | null;
  onClose(): void;
}

export function FeedDialog({ workspaceId, feed, onClose }: FeedDialogProps) {
  const titleId = useId();
  const [initial] = useState<ReadonlySet<string>>(() => new Set(feed?.channelIds));
  const channels = useChoosable(workspaceId, initial);
  const [url, setUrl] = useState(feed?.url ?? '');
  const [name, setName] = useState(feed?.name ?? '');
  const [selected, setSelected] = useState(initial);
  const [mode, setMode] = useState<FeedMode>(feed?.mode ?? 'queue');
  const [template, setTemplate] = useState(feed?.template ?? DEFAULT_TEMPLATE);
  const save = useSaveFeed(workspaceId, feed?.id ?? null, onClose);
  const sent = save.variables?.channelIds ?? [];
  const nameOf = (index: number) => {
    const id = sent[index];
    return channels.find((channel) => channel.id === id)?.displayName ?? id ?? '';
  };
  const errors = save.error === null ? NO_ERRORS : feedErrors(save.error, nameOf);
  const ready =
    url.trim() !== '' && name.trim() !== '' && selected.size > 0 && template.trim() !== '';
  const close = () => {
    if (!save.isPending) onClose();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready || save.isPending) return;
    save.mutate(bodyOf({ url, name, channelIds: [...selected], mode, template }, channels));
  };
  return (
    <Modal labelledBy={titleId} onCancel={close}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h2 id={titleId} className="font-medium text-lg">
          {feed === null
            ? settingsText.settings_feed_add()
            : settingsText.settings_feed_edit_title()}
        </h2>
        <fieldset disabled={save.isPending} className="contents">
          <TextField
            label={settingsText.settings_feed_url()}
            value={url}
            max={FEED_URL_MAX}
            error={errors.url}
            onChange={setUrl}
          />
          <TextField
            label={settingsText.settings_feed_name()}
            value={name}
            max={FEED_NAME_MAX}
            error={errors.name}
            onChange={setName}
          />
          <ChannelChoices
            channels={channels}
            selected={selected}
            errors={errors.channels}
            onChange={setSelected}
          />
          <ModeChoice mode={mode} onChange={setMode} />
          <TemplateField template={template} error={errors.template} onChange={setTemplate} />
        </fieldset>
        {errors.form === undefined ? null : (
          <p role="alert" className="text-destructive text-sm">
            {errors.form}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {settingsText.settings_feed_cancel()}
          </Button>
          <Button type="submit" disabled={!ready || save.isPending}>
            {save.isPending ? settingsText.settings_feed_checking() : m.settings_save()}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
