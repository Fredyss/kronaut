import { Input, Label } from '@kronaut/ui';
import { useId } from 'react';
import { m } from '../i18n.ts';
import type { WhenState } from './when.ts';

export const NOTE_MAX = 2000;

export interface NoteState {
  readonly value: string;
  set(value: string): void;
}

interface WhenFieldsetProps {
  readonly when: WhenState;
  readonly dateId: string;
  readonly timeId: string;
  readonly pending: boolean;
  readonly note?: NoteState | undefined;
}

function NoteField({ note, pending }: { readonly note: NoteState; readonly pending: boolean }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{m.approval_note_label()}</Label>
      <textarea
        id={id}
        value={note.value}
        maxLength={NOTE_MAX}
        disabled={pending}
        rows={2}
        onChange={(event) => note.set(event.currentTarget.value)}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring"
      />
    </div>
  );
}

export function WhenFieldset({ when, dateId, timeId, pending, note }: WhenFieldsetProps) {
  const { mode, setMode, date, setDate, time, setTime, tz } = when;
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 font-medium text-sm">{m.compose_when_title()}</legend>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="asap"
            checked={mode === 'asap'}
            disabled={pending}
            onChange={() => setMode('asap')}
          />
          {m.compose_publish_now()}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="instant"
            checked={mode === 'instant'}
            disabled={pending}
            onChange={() => setMode('instant')}
          />
          {m.compose_schedule()}
        </label>
      </div>
      {mode === 'instant' ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor={dateId}>{m.compose_date()}</Label>
            <Input
              id={dateId}
              type="date"
              value={date}
              disabled={pending}
              onChange={(event) => setDate(event.currentTarget.value)}
              className="w-auto"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={timeId}>{m.compose_time()}</Label>
            <Input
              id={timeId}
              type="time"
              value={time}
              disabled={pending}
              onChange={(event) => setTime(event.currentTarget.value)}
              className="w-auto"
            />
          </div>
          <span className="pb-2 text-muted-foreground text-sm">{m.compose_time_zone({ tz })}</span>
        </div>
      ) : null}
      {note === undefined ? null : <NoteField note={note} pending={pending} />}
    </fieldset>
  );
}
