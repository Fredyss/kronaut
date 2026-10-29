import { Input, Label } from '@kronaut/ui';
import { useId } from 'react';
import { useWeekdayFormat } from '../format.ts';
import { m } from '../i18n.ts';
import { SELECT } from '../locale-select.tsx';
import { useRuleText, WEEKDAYS } from '../series/rule-text.ts';
import type { End, Freq, RepeatControl, RepeatState } from './repeat.ts';

interface RepeatProps {
  readonly repeat: RepeatState;
  readonly pending: boolean;
}

const FREQS: readonly [Freq, () => string][] = [
  ['none', m.repeat_never],
  ['daily', m.repeat_daily],
  ['weekly', m.repeat_weekly],
  ['monthly', m.repeat_monthly],
];

const ENDS: readonly [End, () => string][] = [
  ['never', m.repeat_never],
  ['until', m.repeat_on],
  ['count', m.repeat_after],
];

function Days({ repeat, pending }: RepeatProps) {
  const weekday = useWeekdayFormat();
  return (
    <div className="flex flex-wrap gap-3">
      {WEEKDAYS.map((day, index) => (
        <label key={day} className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={repeat.days.includes(day)}
            disabled={pending}
            onChange={() => repeat.toggle(day)}
            className="size-4 accent-primary"
          />
          {weekday(index + 1)}
        </label>
      ))}
    </div>
  );
}

function NumberField(props: {
  readonly label: string;
  readonly value: string;
  readonly max: number;
  readonly pending: boolean;
  set(value: string): void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{props.label}</Label>
      <Input
        id={id}
        type="number"
        min={1}
        max={props.max}
        value={props.value}
        disabled={props.pending}
        onChange={(event) => props.set(event.currentTarget.value)}
        className="w-20"
      />
    </div>
  );
}

function EndFields({ repeat, pending }: RepeatProps) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={id}>{m.repeat_ends()}</Label>
        <select
          id={id}
          value={repeat.end}
          disabled={pending}
          onChange={(event) => repeat.setEnd(event.currentTarget.value as End)}
          className={SELECT}
        >
          {ENDS.map(([value, label]) => (
            <option key={value} value={value}>
              {label()}
            </option>
          ))}
        </select>
      </div>
      {repeat.end === 'until' ? (
        <Input
          type="date"
          aria-label={m.repeat_on()}
          value={repeat.until}
          disabled={pending}
          onChange={(event) => repeat.setUntil(event.currentTarget.value)}
          className="w-auto"
        />
      ) : null}
      {repeat.end === 'count' ? (
        <NumberField
          label={m.repeat_after()}
          value={repeat.count}
          max={500}
          pending={pending}
          set={repeat.setCount}
        />
      ) : null}
    </div>
  );
}

function Preview({ control }: { readonly control: RepeatControl }) {
  const ruleText = useRuleText();
  const { preview, often } = control;
  if (!('repeat' in preview) || preview.repeat === undefined) return null;
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p className="text-muted-foreground">{ruleText(preview.repeat).join(' · ')}</p>
      {often ? <p role="note">{m.repeat_warning()}</p> : null}
    </div>
  );
}

export function RepeatFields({
  control,
  pending,
}: {
  readonly control: RepeatControl;
  readonly pending: boolean;
}) {
  const repeat = control.state;
  const id = useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={id}>{m.repeat_label()}</Label>
          <select
            id={id}
            value={repeat.freq}
            disabled={pending}
            onChange={(event) => repeat.setFreq(event.currentTarget.value as Freq)}
            className={SELECT}
          >
            {FREQS.map(([value, label]) => (
              <option key={value} value={value}>
                {label()}
              </option>
            ))}
          </select>
        </div>
        {repeat.freq === 'none' ? null : (
          <NumberField
            label={m.repeat_every()}
            value={repeat.every}
            max={99}
            pending={pending}
            set={repeat.setEvery}
          />
        )}
        {repeat.freq === 'monthly' ? (
          <NumberField
            label={m.calendar_view_day()}
            value={repeat.monthDay}
            max={31}
            pending={pending}
            set={repeat.setMonthDay}
          />
        ) : null}
      </div>
      {repeat.freq === 'weekly' ? <Days repeat={repeat} pending={pending} /> : null}
      {repeat.freq === 'none' ? null : <EndFields repeat={repeat} pending={pending} />}
      {repeat.freq === 'none' ? null : <Preview control={control} />}
    </div>
  );
}
