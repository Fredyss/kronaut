import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { type Dispatch, type SetStateAction, useId } from 'react';
import { useApiClient } from '../../../base/api/client.ts';
import { useLocale } from '../../../base/locale/context.ts';
import { m } from '../../../base/locale/i18n.ts';
import { type PublishChoice, providerUi } from '../../../base/providers/ui.ts';
import { m as composeText } from '../../../i18n/compose.ts';
import { type Brand, brandsQuery, groupByBrand } from '../../../records/brands/queries.ts';
import type { Channel } from '../../../records/channels/queries.ts';
import { statusLabel } from '../../../records/channels/status-label.ts';
import { choiceFor, type MediaFacts } from './choice.ts';

export function channelHint(
  channel: Channel,
  choice: PublishChoice,
  locale: string,
): string | null {
  if (channel.status !== 'active') return statusLabel(channel.status);
  if (choice.kind === 'needs_image') return composeText.compose_channel_needs_image();
  if (choice.kind === 'image_type_unsupported') return composeText.compose_channel_image_type();
  if (choice.kind === 'too_many_images')
    return composeText.compose_channel_too_many_images({ count: choice.max });
  if (choice.kind === 'image_too_large') {
    const max = new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: 'megabyte',
      maximumFractionDigits: 1,
    }).format(choice.maxBytes / 1_000_000);
    return composeText.compose_channel_image_too_large({ max });
  }
  if (choice.kind === 'video_unsupported') return composeText.compose_channel_video_unsupported();
  if (choice.kind === 'unsupported') return composeText.compose_channel_unsupported();
  return null;
}

interface PickerProps {
  readonly channels: readonly Channel[];
  readonly brands: readonly Brand[] | undefined;
  readonly mediaFor: (channelId: string) => MediaFacts;
  readonly customized: (channelId: string) => boolean;
  readonly selected: ReadonlySet<string>;
  readonly disabled: boolean;
  readonly toggle: (ids: readonly string[], on: boolean) => void;
}

interface Row {
  readonly channel: Channel;
  readonly hint: string | null;
  readonly usable: boolean;
}

function ChannelRows({
  rows,
  picker,
}: {
  readonly rows: readonly Row[];
  readonly picker: PickerProps;
}) {
  const prefix = useId();
  const { selected, disabled, toggle } = picker;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map(({ channel, hint, usable }) => {
        const id = `${prefix}-${channel.id}`;
        const hintId = `${id}-hint`;
        return (
          <li key={channel.id} className="flex items-start gap-3">
            <input
              id={id}
              type="checkbox"
              className="mt-0.5 size-4"
              checked={usable && selected.has(channel.id)}
              disabled={disabled || !usable}
              aria-describedby={hint === null ? undefined : hintId}
              onChange={(event) => toggle([channel.id], event.currentTarget.checked)}
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

function BrandGroup({
  name,
  rows,
  picker,
}: {
  name: string;
  rows: readonly Row[];
  picker: PickerProps;
}) {
  const selectable = rows.filter((row) => row.usable).map((row) => row.channel.id);
  const all = selectable.length > 0 && selectable.every((id) => picker.selected.has(id));
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-muted-foreground text-xs">{name}</h3>
        <button
          type="button"
          className="text-xs underline underline-offset-4 disabled:no-underline disabled:opacity-50"
          disabled={picker.disabled || selectable.length === 0}
          aria-label={
            all
              ? composeText.compose_brand_clear_of({ name })
              : composeText.compose_brand_select_all_of({ name })
          }
          onClick={() => picker.toggle(selectable, !all)}
        >
          {all ? composeText.compose_brand_clear() : composeText.compose_brand_select_all()}
        </button>
      </div>
      <ChannelRows rows={rows} picker={picker} />
    </section>
  );
}

function ChannelPicker(picker: PickerProps) {
  const { channels, brands, mediaFor, customized, selected } = picker;
  const { locale } = useLocale();
  if (channels.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {composeText.compose_no_channels()}{' '}
        <Link to="/channels" className="underline underline-offset-4">
          {composeText.compose_connect_channel()}
        </Link>
      </p>
    );
  }
  const rowsOf = (items: readonly Channel[]): Row[] =>
    items.map((channel) => {
      const choice = choiceFor(channel, mediaFor(channel.id));
      const usable = choice.kind === 'ok' || (customized(channel.id) && selected.has(channel.id));
      return { channel, hint: channelHint(channel, choice, locale), usable };
    });
  if (brands === undefined || brands.length === 0) {
    return <ChannelRows rows={rowsOf(channels)} picker={picker} />;
  }
  return (
    <div className="flex flex-col gap-4">
      {groupByBrand(channels, brands).map(({ brand, items }) => (
        <BrandGroup
          key={brand?.id ?? ''}
          name={brand === null ? m.brand_none() : brand.name}
          rows={rowsOf(items)}
          picker={picker}
        />
      ))}
    </div>
  );
}

interface ChannelsFieldsetProps {
  readonly workspaceId: string;
  readonly channels: readonly Channel[] | undefined;
  readonly failed: boolean;
  readonly mediaFor: (channelId: string) => MediaFacts;
  readonly customized: (channelId: string) => boolean;
  readonly stored: ReadonlySet<string>;
  readonly selected: ReadonlySet<string>;
  readonly setSelected: Dispatch<SetStateAction<ReadonlySet<string>>>;
  readonly pending: boolean;
}

export function ChannelsFieldset({
  workspaceId,
  channels,
  failed,
  mediaFor,
  customized,
  stored,
  selected,
  setSelected,
  pending,
}: ChannelsFieldsetProps) {
  const client = useApiClient();
  const brands = useQuery(brandsQuery(client, workspaceId)).data;
  const held = (id: string) => stored.has(id) && selected.has(id);
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 font-medium text-sm">{composeText.compose_channels_title()}</legend>
      {failed ? (
        <p role="alert" className="text-destructive text-sm">
          {m.error_generic()}
        </p>
      ) : null}
      {channels === undefined ? null : (
        <ChannelPicker
          channels={channels.filter(({ id, status }) => status !== 'disconnected' || held(id))}
          brands={brands}
          mediaFor={mediaFor}
          customized={(id) => customized(id) || held(id)}
          selected={selected}
          disabled={pending}
          toggle={(ids, on) =>
            setSelected((current) => {
              const next = new Set(current);
              for (const id of ids) {
                if (on) next.add(id);
                else next.delete(id);
              }
              return next;
            })
          }
        />
      )}
    </fieldset>
  );
}
