import { Input, Select } from '@kronaut/ui';
import { type Dispatch, type SetStateAction, useId } from 'react';
import type { Channel } from '../channels/queries.ts';
import { m as calendarText } from '../i18n/calendar.ts';
import { m } from '../locale/i18n.ts';
import { providerUi } from '../providers/ui.ts';
import { downloadExample } from './example.ts';

export interface ImportSettings {
  readonly defaults: ReadonlySet<string>;
  readonly setDefaults: Dispatch<SetStateAction<ReadonlySet<string>>>;
  readonly tz: string;
  readonly setTz: (tz: string) => void;
}

interface FieldsProps {
  readonly channels: readonly Channel[];
  readonly settings: ImportSettings;
  readonly fileName: string | null;
  pick(file: File): void;
}

function zones(current: string): string[] {
  return [...new Set([current, ...Intl.supportedValuesOf('timeZone')])].sort();
}

function toggled(current: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> {
  const next = new Set(current);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

function DefaultChannels({ channels, settings }: Pick<FieldsProps, 'channels' | 'settings'>) {
  const prefix = useId();
  if (channels.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{calendarText.calendar_import_no_channels()}</p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {channels.map((channel) => {
        const id = `${prefix}-${channel.id}`;
        return (
          <li key={channel.id} className="flex items-center gap-3">
            <input
              id={id}
              type="checkbox"
              className="size-4"
              checked={settings.defaults.has(channel.id)}
              onChange={(event) =>
                settings.setDefaults((current) =>
                  toggled(current, channel.id, event.currentTarget.checked),
                )
              }
            />
            <label htmlFor={id} className="text-sm">
              {channel.displayName}{' '}
              <span className="text-muted-foreground">{providerUi(channel.provider).name()}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function exampleHandles(channels: readonly Channel[], defaults: ReadonlySet<string>): string[] {
  const picked = channels.filter((channel) => defaults.has(channel.id));
  const source = picked.length > 0 ? picked : channels.slice(0, 1);
  return source.flatMap((channel) => channel.handle ?? []);
}

export function ImportFields({ channels, settings, fileName, pick }: FieldsProps) {
  const fileId = useId();
  const zoneId = useId();
  const hintId = useId();
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-muted-foreground">{calendarText.calendar_import_intro()}</p>
      <button
        type="button"
        className="self-start underline underline-offset-4"
        onClick={() => downloadExample(exampleHandles(channels, settings.defaults), settings.tz)}
      >
        {calendarText.calendar_import_example()}
      </button>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fileId} className="font-medium">
          {calendarText.calendar_import_file()}
        </label>
        <Input
          id={fileId}
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const input = event.currentTarget;
            const [file] = input.files ?? [];
            if (file !== undefined) pick(file);
            input.value = '';
          }}
        />
        {fileName === null ? null : <p className="text-muted-foreground">{fileName}</p>}
      </div>
      <fieldset className="flex flex-col gap-2" aria-describedby={hintId}>
        <legend className="mb-1 font-medium">{calendarText.calendar_import_channels()}</legend>
        <p id={hintId} className="text-muted-foreground">
          {calendarText.calendar_import_channels_hint()}
        </p>
        <DefaultChannels channels={channels} settings={settings} />
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={zoneId} className="font-medium">
          {m.queue_zone()}
        </label>
        <Select
          id={zoneId}
          value={settings.tz}
          onChange={(event) => settings.setTz(event.currentTarget.value)}
        >
          {zones(settings.tz).map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
