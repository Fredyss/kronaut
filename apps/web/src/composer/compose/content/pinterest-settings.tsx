import { Input, Label, Select } from '@kronaut/ui';
import { type ReactNode, useId } from 'react';
import { useLocale } from '../../../base/locale/context.ts';
import { providerUi } from '../../../base/providers/ui.ts';
import { m as composeText } from '../../../i18n/compose.ts';
import type { Channel } from '../../../records/channels/queries.ts';
import {
  type BoardOption,
  boardOptions,
  linkProblem,
  PIN_TITLE_MAX,
  pinterestFields,
} from './pinterest.ts';
import type { ContentsState } from './use-contents.ts';
import { withField } from './youtube.ts';

interface FieldProps {
  readonly value: string;
  readonly pending: boolean;
  onChange(value: string): void;
}

function FieldLabel({ id, label, note }: { id: string; label: string; note: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <Label htmlFor={id}>{label}</Label>
      <span aria-hidden="true" className="text-muted-foreground text-xs">
        {note}
      </span>
    </div>
  );
}

function withStored(options: readonly BoardOption[], value: string): readonly BoardOption[] {
  if (value === '' || options.some((option) => option.value === value)) return options;
  return [...options, { value, label: value }];
}

function BoardField({
  value,
  pending,
  onChange,
  options,
}: FieldProps & { options: readonly BoardOption[] }) {
  const id = useId();
  const label = composeText.compose_pinterest_board();
  if (options.length === 0 && value === '') {
    return (
      <p className="text-muted-foreground text-sm">{composeText.compose_pinterest_no_boards()}</p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel id={id} label={label} note={composeText.compose_pinterest_required()} />
      <Select
        id={id}
        value={value}
        required
        disabled={pending}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="">{composeText.compose_pinterest_board_pick()}</option>
        {withStored(options, value).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function Problem({ id, children }: { readonly id: string; readonly children: ReactNode }) {
  return (
    <p id={id} className="text-destructive text-xs">
      {children}
    </p>
  );
}

function TitleField({ value, pending, onChange }: FieldProps) {
  const id = useId();
  const countId = useId();
  const { locale } = useLocale();
  const number = new Intl.NumberFormat(locale);
  const tooLong = value.length > PIN_TITLE_MAX;
  const count = composeText.compose_pinterest_title_count({
    count: number.format(value.length),
    max: number.format(PIN_TITLE_MAX),
  });
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel
        id={id}
        label={composeText.compose_pinterest_title()}
        note={composeText.compose_pinterest_optional()}
      />
      <Input
        id={id}
        value={value}
        disabled={pending}
        aria-invalid={tooLong}
        aria-describedby={countId}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <div className="flex items-start justify-between gap-2">
        <span className="text-destructive text-xs">
          {tooLong ? composeText.compose_pinterest_title_too_long() : null}
        </span>
        <span
          id={countId}
          className={tooLong ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'}
        >
          {count}
        </span>
      </div>
    </div>
  );
}

function LinkField({ value, pending, onChange }: FieldProps) {
  const id = useId();
  const problemId = useId();
  const problem = linkProblem(value);
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel
        id={id}
        label={composeText.compose_pinterest_link()}
        note={composeText.compose_pinterest_optional()}
      />
      <Input
        id={id}
        type="url"
        inputMode="url"
        value={value}
        disabled={pending}
        aria-invalid={problem !== null}
        aria-describedby={problem === null ? undefined : problemId}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {problem === null ? null : (
        <Problem id={problemId}>
          {problem === 'too_long'
            ? composeText.compose_pinterest_link_too_long()
            : composeText.compose_pinterest_link_invalid()}
        </Problem>
      )}
    </div>
  );
}

interface PinterestSettingsProps {
  readonly state: ContentsState;
  readonly channel: Channel | undefined;
  readonly pending: boolean;
}

export function PinterestSettings({ state, channel, pending }: PinterestSettingsProps) {
  if (channel === undefined || channel.provider !== 'pinterest') return null;
  const settings = state.settingsOf(channel);
  if (settings === undefined) return null;
  const fields = pinterestFields(settings);
  const set = (field: string) => (value: string) =>
    state.setSettings(channel.id, withField(settings, field, value === '' ? undefined : value));
  return (
    <fieldset className="flex flex-col gap-4 rounded-md border p-4">
      <legend className="px-1 font-medium text-sm">{providerUi(channel.provider).name()}</legend>
      <BoardField
        value={fields.boardId}
        pending={pending}
        options={boardOptions(channel)}
        onChange={set('boardId')}
      />
      <TitleField value={fields.title} pending={pending} onChange={set('title')} />
      <LinkField value={fields.link} pending={pending} onChange={set('link')} />
    </fieldset>
  );
}
