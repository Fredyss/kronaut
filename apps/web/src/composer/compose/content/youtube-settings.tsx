import { Button, Input, Label, Select } from '@kronaut/ui';
import { useId } from 'react';
import { useLocale } from '../../../base/locale/context.ts';
import { providerUi } from '../../../base/providers/ui.ts';
import { m as composeText } from '../../../i18n/compose.ts';
import type { Channel } from '../../../records/channels/queries.ts';
import { effective } from './contents.ts';
import type { ContentsState } from './use-contents.ts';
import type { Settings } from './use-settings.ts';
import {
  firstLine,
  PRIVACIES,
  type Privacy,
  TITLE_FORBIDDEN,
  TITLE_MAX,
  titleProblems,
  withField,
  youtubeFields,
} from './youtube.ts';

const PRIVACY_LABELS: Readonly<Record<Privacy, () => string>> = {
  public: () => composeText.compose_youtube_public(),
  unlisted: () => composeText.compose_youtube_unlisted(),
  private: () => composeText.compose_youtube_private(),
};

const AUDIENCES = [
  ['default', undefined, () => composeText.compose_youtube_audience_default()],
  ['kids', true, () => composeText.compose_youtube_kids()],
  ['not_kids', false, () => composeText.compose_youtube_not_kids()],
] as const;

interface FieldProps<T> {
  readonly value: T;
  readonly pending: boolean;
  onChange(value: T): void;
}

function TitleErrors({ title, id }: { readonly title: string; readonly id: string }) {
  const { locale } = useLocale();
  const { tooLong, forbidden } = titleProblems(title);
  const chars = new Intl.ListFormat(locale, { type: 'disjunction' }).format(TITLE_FORBIDDEN);
  return (
    <ul id={id} className="flex flex-col gap-0.5 text-destructive text-xs">
      {tooLong ? <li>{composeText.compose_youtube_title_too_long()}</li> : null}
      {forbidden ? <li>{composeText.compose_youtube_title_chars({ chars })}</li> : null}
    </ul>
  );
}

function TitleField({
  value,
  pending,
  onChange,
  line,
}: FieldProps<string> & { readonly line: string | null }) {
  const id = useId();
  const countId = useId();
  const errorsId = useId();
  const { locale } = useLocale();
  const format = (count: number) => new Intl.NumberFormat(locale).format(count);
  const { tooLong, forbidden } = titleProblems(value);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <Label htmlFor={id}>{composeText.compose_youtube_title()}</Label>
          <span aria-hidden="true" className="text-muted-foreground text-xs">
            {composeText.compose_youtube_required()}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending || line === null}
          onClick={() => onChange(line ?? value)}
        >
          {composeText.compose_youtube_first_line()}
        </Button>
      </div>
      <Input
        id={id}
        value={value}
        required
        disabled={pending}
        aria-invalid={tooLong || forbidden}
        aria-describedby={`${countId} ${errorsId}`}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <div className="flex items-start justify-between gap-2">
        <TitleErrors title={value} id={errorsId} />
        <span
          id={countId}
          className={tooLong ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'}
        >
          {composeText.compose_youtube_title_count({
            count: format(value.length),
            max: format(TITLE_MAX),
          })}
        </span>
      </div>
    </div>
  );
}

function PrivacyField({ value, pending, onChange }: FieldProps<Privacy>) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium text-sm">
        {composeText.compose_youtube_visibility()}
      </legend>
      <div className="flex flex-wrap gap-4 text-sm">
        {PRIVACIES.map((privacy) => (
          <label key={privacy} className="flex items-center gap-2">
            <input
              type="radio"
              name={name}
              value={privacy}
              checked={value === privacy}
              disabled={pending}
              onChange={() => onChange(privacy)}
            />
            {PRIVACY_LABELS[privacy]()}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function AudienceField({ value, pending, onChange }: FieldProps<boolean | undefined>) {
  const id = useId();
  const current = AUDIENCES.find(([, madeForKids]) => madeForKids === value) ?? AUDIENCES[0];
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{composeText.compose_youtube_audience()}</Label>
      <Select
        id={id}
        value={current[0]}
        disabled={pending}
        className="w-auto"
        onChange={(event) => {
          const picked = AUDIENCES.find(([key]) => key === event.currentTarget.value);
          onChange(picked?.[1]);
        }}
      >
        {AUDIENCES.map(([key, , label]) => (
          <option key={key} value={key}>
            {label()}
          </option>
        ))}
      </Select>
    </div>
  );
}

interface YoutubeFieldsetProps {
  readonly channel: Channel;
  readonly settings: Settings;
  readonly state: ContentsState;
  readonly pending: boolean;
}

function YoutubeFieldset({ channel, settings, state, pending }: YoutubeFieldsetProps) {
  const fields = youtubeFields(settings);
  const set = (field: string, value: unknown) =>
    state.setSettings(channel.id, withField(settings, field, value));
  return (
    <fieldset className="flex flex-col gap-4 rounded-md border p-4">
      <legend className="px-1 font-medium text-sm">{providerUi(channel.provider).name()}</legend>
      <TitleField
        value={fields.title}
        pending={pending}
        line={firstLine(effective(state.contents, channel.id).doc)}
        onChange={(title) => set('title', title === '' ? undefined : title)}
      />
      <PrivacyField
        value={fields.privacy}
        pending={pending}
        onChange={(privacy) => set('privacy', privacy)}
      />
      <AudienceField
        value={fields.madeForKids}
        pending={pending}
        onChange={(madeForKids) => set('madeForKids', madeForKids)}
      />
    </fieldset>
  );
}

interface YoutubeSettingsProps {
  readonly state: ContentsState;
  readonly channel: Channel | undefined;
  readonly pending: boolean;
}

export function YoutubeSettings({ state, channel, pending }: YoutubeSettingsProps) {
  if (channel === undefined || channel.provider !== 'youtube') return null;
  const settings = state.settingsOf(channel);
  if (settings === undefined) return null;
  return <YoutubeFieldset channel={channel} settings={settings} state={state} pending={pending} />;
}
