import { useId } from 'react';
import { providerUi } from '../../base/providers/ui.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import type { Channel } from '../../records/channels/queries.ts';
import { FEED_TEMPLATE_MAX, type FeedMode, PLACEHOLDERS } from './feeds.ts';

const TEXT_AREA =
  'min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring aria-invalid:border-destructive';

const PLACEHOLDER_TEXT: Readonly<Record<(typeof PLACEHOLDERS)[number], () => string>> = {
  title: () => settingsText.settings_feed_placeholder_title(),
  link: () => settingsText.settings_feed_placeholder_link(),
  summary: () => settingsText.settings_feed_placeholder_summary(),
};

export function FieldError({
  id,
  message,
}: {
  readonly id: string;
  readonly message?: string | undefined;
}) {
  if (message === undefined) return null;
  return (
    <p id={id} className="text-destructive text-sm">
      {message}
    </p>
  );
}

function toggled(current: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> {
  const next = new Set(current);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

export function ChannelChoices({
  channels,
  selected,
  errors,
  onChange,
}: {
  readonly channels: readonly Channel[];
  readonly selected: ReadonlySet<string>;
  readonly errors: readonly string[];
  onChange(next: ReadonlySet<string>): void;
}) {
  const prefix = useId();
  const hintId = useId();
  const errorId = useId();
  return (
    <fieldset
      className="flex flex-col gap-2 text-sm"
      aria-describedby={errors.length > 0 ? `${hintId} ${errorId}` : hintId}
    >
      <legend className="mb-1 font-medium">{settingsText.settings_feed_channels()}</legend>
      <p id={hintId} className="text-muted-foreground">
        {channels.length === 0
          ? settingsText.settings_feed_no_channels()
          : settingsText.settings_feed_channels_hint()}
      </p>
      <ul className="flex flex-col gap-2">
        {channels.map((channel) => {
          const id = `${prefix}-${channel.id}`;
          return (
            <li key={channel.id} className="flex items-center gap-3">
              <input
                id={id}
                type="checkbox"
                className="size-4"
                checked={selected.has(channel.id)}
                onChange={(event) =>
                  onChange(toggled(selected, channel.id, event.currentTarget.checked))
                }
              />
              <label htmlFor={id}>
                {channel.displayName}{' '}
                <span className="text-muted-foreground">{providerUi(channel.provider).name()}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {errors.length > 0 ? (
        <ul id={errorId} className="flex flex-col gap-1 text-destructive">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
}

export function ModeChoice({
  mode,
  onChange,
}: {
  readonly mode: FeedMode;
  onChange(mode: FeedMode): void;
}) {
  const name = useId();
  const options = [
    { value: 'queue', label: settingsText.settings_feed_mode_queue() },
    { value: 'draft', label: settingsText.settings_feed_mode_draft() },
  ] as const;
  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="mb-1 font-medium">{settingsText.settings_feed_mode()}</legend>
      {options.map((option) => (
        <div key={option.value} className="flex items-center gap-3">
          <input
            id={`${name}-${option.value}`}
            type="radio"
            name={name}
            className="size-4"
            checked={mode === option.value}
            onChange={() => onChange(option.value)}
          />
          <label htmlFor={`${name}-${option.value}`}>{option.label}</label>
        </div>
      ))}
    </fieldset>
  );
}

export function TemplateField({
  template,
  error,
  onChange,
}: {
  readonly template: string;
  readonly error?: string | undefined;
  onChange(template: string): void;
}) {
  const id = useId();
  const listId = useId();
  const errorId = useId();
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={id} className="font-medium">
        {settingsText.settings_feed_template()}
      </label>
      <textarea
        id={id}
        value={template}
        maxLength={FEED_TEMPLATE_MAX}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={error === undefined ? listId : `${listId} ${errorId}`}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={TEXT_AREA}
      />
      <FieldError id={errorId} message={error} />
      <div id={listId} className="text-muted-foreground">
        <p>{settingsText.settings_feed_placeholders()}</p>
        <ul className="flex flex-col gap-0.5">
          {PLACEHOLDERS.map((placeholder) => (
            <li key={placeholder}>
              <code className="font-mono text-foreground">{`{${placeholder}}`}</code>{' '}
              {PLACEHOLDER_TEXT[placeholder]()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
