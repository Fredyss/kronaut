import { Input, Label } from '@kronaut/ui';
import { lazy, type ReactNode, Suspense, useId } from 'react';
import { useFormat } from '../format.ts';
import { m } from '../i18n.ts';
import { issueMessage } from './issues.ts';
import type { QueueChoice, QueueEntry } from './queue-choice.ts';
import type { RepeatControl } from './repeat.ts';
import type { Mode, WhenState } from './when.ts';

export const NOTE_MAX = 2000;

const RepeatFields = lazy(() =>
  import('./repeat-fieldset.tsx').then((module) => ({ default: module.RepeatFields })),
);

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
  readonly queue?: QueueChoice | undefined;
  readonly repeat?: RepeatControl | undefined;
  readonly extraMode?: ReactNode;
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

interface ModeOptionProps {
  readonly value: Mode;
  readonly label: string;
  readonly when: WhenState;
  readonly disabled: boolean;
}

export function ModeOption({ value, label, when, disabled }: ModeOptionProps) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="radio"
        name="mode"
        value={value}
        checked={when.mode === value}
        disabled={disabled}
        onChange={() => when.setMode(value)}
      />
      {label}
    </label>
  );
}

function QueueLine({ entry: { channel, queue } }: { readonly entry: QueueEntry }) {
  const next = queue?.upcoming[0];
  const format = useFormat(next?.timezone ?? null);
  const name = channel.displayName;
  if (queue === undefined) return null;
  if (queue.timezone === null) {
    return <li className="text-destructive">{m.compose_queue_empty({ channel: name })}</li>;
  }
  if (next === undefined) {
    return (
      <li>{m.compose_issue_on_channel({ channel: name, message: issueMessage('queue_full') })}</li>
    );
  }
  return (
    <li>{m.compose_queue_next({ channel: name, when: format(next.at), tz: next.timezone })}</li>
  );
}

function QueueLines({ queue, all }: { readonly queue: QueueChoice; readonly all: boolean }) {
  const shown = all ? queue.entries : queue.entries.filter((e) => e.queue?.timezone === null);
  if (shown.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1 text-muted-foreground text-sm">
      {shown.map((entry) => (
        <QueueLine key={entry.channel.id} entry={entry} />
      ))}
    </ul>
  );
}

export function WhenFieldset(props: WhenFieldsetProps) {
  const { when, dateId, timeId, pending, note, queue, repeat, extraMode } = props;
  const { mode, date, setDate, time, setTime, tz } = when;
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 font-medium text-sm">{m.compose_when_title()}</legend>
      <div className="flex flex-wrap gap-4 text-sm">
        <ModeOption value="asap" label={m.compose_publish_now()} when={when} disabled={pending} />
        <ModeOption value="instant" label={m.compose_schedule()} when={when} disabled={pending} />
        {queue === undefined ? null : (
          <ModeOption
            value="queue"
            label={m.compose_add_to_queue()}
            when={when}
            disabled={pending || queue.empty !== undefined}
          />
        )}
        {extraMode}
      </div>
      {queue === undefined ? null : <QueueLines queue={queue} all={mode === 'queue'} />}
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
      {mode === 'instant' && repeat !== undefined ? (
        <Suspense fallback={null}>
          <RepeatFields control={repeat} pending={pending} />
        </Suspense>
      ) : null}
      {note === undefined ? null : <NoteField note={note} pending={pending} />}
    </fieldset>
  );
}
