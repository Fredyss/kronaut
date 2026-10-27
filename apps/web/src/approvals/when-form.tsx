import { Button } from '@kronaut/ui';
import { useId, useState } from 'react';
import type { ComposeWhen } from '../compose/submit.ts';
import { resolveWhen, submitLabel, useWhen } from '../compose/when.ts';
import { WhenFieldset } from '../compose/when-fieldset.tsx';
import { m } from '../i18n.ts';

interface WhenFormProps {
  readonly request: boolean;
  readonly pending: boolean;
  readonly error: string | null;
  onSubmit(when: ComposeWhen, note: string): void;
  onCancel(): void;
}

export function WhenForm({ request, pending, error, onSubmit, onCancel }: WhenFormProps) {
  const when = useWhen();
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const dateId = useId();
  const timeId = useId();
  const shown = problem ?? error;
  return (
    <form
      className="flex flex-col gap-4 rounded-lg border p-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const resolved = resolveWhen(when.mode, when.date, when.time, when.tz);
        if ('problem' in resolved) return setProblem(resolved.problem);
        setProblem(null);
        onSubmit(resolved.when, note);
      }}
    >
      <WhenFieldset
        when={when}
        dateId={dateId}
        timeId={timeId}
        pending={pending}
        note={request ? { value: note, set: setNote } : undefined}
      />
      {shown === null ? null : (
        <p role="alert" className="text-destructive text-sm">
          {shown}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {submitLabel(when.mode, pending, request)}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {m.inbox_confirm_back()}
        </Button>
      </div>
    </form>
  );
}
