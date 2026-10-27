import { Link } from '@tanstack/react-router';
import { type Dispatch, type SetStateAction, useId } from 'react';
import type { Channel } from '../api.ts';
import { useLocale } from '../context.ts';
import { m } from '../i18n.ts';
import { type PublishChoice, providerUi } from '../providers.ts';
import { statusLabel } from '../routes/channels.tsx';
import { choiceFor, type MediaFacts } from './choice.ts';

export function channelHint(
  channel: Channel,
  choice: PublishChoice,
  locale: string,
): string | null {
  if (channel.status !== 'active') return statusLabel(channel.status);
  if (choice.kind === 'needs_image') return m.compose_channel_needs_image();
  if (choice.kind === 'image_type_unsupported') return m.compose_channel_image_type();
  if (choice.kind === 'too_many_images')
    return m.compose_channel_too_many_images({ count: choice.max });
  if (choice.kind === 'image_too_large') {
    const max = new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'megabyte',
      maximumFractionDigits: 1,
    }).format(choice.maxBytes / 1_000_000);
    return m.compose_channel_image_too_large({ max });
  }
  if (choice.kind === 'video_unsupported') return m.compose_channel_video_unsupported();
  if (choice.kind === 'unsupported') return m.compose_channel_unsupported();
  return null;
}

function ChannelPicker({
  channels,
  mediaFor,
  customized,
  selected,
  disabled,
  toggle,
}: {
  readonly channels: readonly Channel[];
  readonly mediaFor: (channelId: string) => MediaFacts;
  readonly customized: (channelId: string) => boolean;
  readonly selected: ReadonlySet<string>;
  readonly disabled: boolean;
  readonly toggle: (id: string, on: boolean) => void;
}) {
  const prefix = useId();
  const { locale } = useLocale();
  if (channels.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {m.compose_no_channels()}{' '}
        <Link to="/channels" className="underline underline-offset-4">
          {m.compose_connect_channel()}
        </Link>
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {channels.map((channel) => {
        const choice = choiceFor(channel, mediaFor(channel.id));
        const hint = channelHint(channel, choice, locale);
        const id = `${prefix}-${channel.id}`;
        const hintId = `${id}-hint`;
        const usable = choice.kind === 'ok' || (customized(channel.id) && selected.has(channel.id));
        return (
          <li key={channel.id} className="flex items-start gap-3">
            <input
              id={id}
              type="checkbox"
              className="mt-0.5 size-4"
              checked={usable && selected.has(channel.id)}
              disabled={disabled || !usable}
              aria-describedby={hint === null ? undefined : hintId}
              onChange={(event) => toggle(channel.id, event.currentTarget.checked)}
            />
            <div className="flex flex-col gap-0.5">
              <label htmlFor={id} className="font-medium text-sm">
                {channel.displayName}{' '}
                <span className="font-normal text-muted-foreground">
                  {providerUi(channel.provider).name()}
                </span>
              </label>
              {hint === null ? null : (
                <span id={hintId} className="text-muted-foreground text-xs">
                  {hint}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface ChannelsFieldsetProps {
  readonly channels: readonly Channel[] | undefined;
  readonly failed: boolean;
  readonly mediaFor: (channelId: string) => MediaFacts;
  readonly customized: (channelId: string) => boolean;
  readonly selected: ReadonlySet<string>;
  readonly setSelected: Dispatch<SetStateAction<ReadonlySet<string>>>;
  readonly pending: boolean;
}

export function ChannelsFieldset({
  channels,
  failed,
  mediaFor,
  customized,
  selected,
  setSelected,
  pending,
}: ChannelsFieldsetProps) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 font-medium text-sm">{m.compose_channels_title()}</legend>
      {failed ? (
        <p role="alert" className="text-destructive text-sm">
          {m.error_generic()}
        </p>
      ) : null}
      {channels === undefined ? null : (
        <ChannelPicker
          channels={channels.filter((channel) => channel.status !== 'disconnected')}
          mediaFor={mediaFor}
          customized={customized}
          selected={selected}
          disabled={pending}
          toggle={(id, on) =>
            setSelected((current) => {
              const next = new Set(current);
              if (on) next.add(id);
              else next.delete(id);
              return next;
            })
          }
        />
      )}
    </fieldset>
  );
}
