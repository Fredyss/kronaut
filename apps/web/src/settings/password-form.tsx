import { authPasswordChange } from '@kronaut/sdk';
import { Button, Input, Label, toast } from '@kronaut/ui';
import { useMutation } from '@tanstack/react-query';
import { type FormEvent, type RefObject, useEffect, useId, useRef, useState } from 'react';
import { errorDetails, errorStatus, isUnauthenticated } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m as settingsText } from '../i18n/settings.ts';
import { m } from '../i18n.ts';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordHint,
  passwordProblem,
  policyMessage,
} from '../password-policy.ts';
import { SettingsCard, SettingsRow } from './card.tsx';

interface Problems {
  readonly current?: string;
  readonly next?: string;
  readonly repeat?: string;
  readonly form?: string;
}

function serverProblems(error: unknown): Problems | null {
  if (errorStatus(error) !== 422) return null;
  for (const { path, code } of errorDetails(error)) {
    if (path === 'body.currentPassword' && code === 'incorrect') {
      return { current: settingsText.settings_password_incorrect() };
    }
    if (path === 'body.currentPassword' && code === 'two_factor_unavailable') {
      return { form: settingsText.settings_password_two_factor() };
    }
    const policy = path === 'body.newPassword' ? policyMessage(code) : null;
    if (policy !== null) return { next: policy };
  }
  return null;
}

interface FieldProps {
  readonly label: string;
  readonly value: string;
  readonly current?: boolean;
  readonly error: string | undefined;
  readonly hint?: string;
  readonly inputRef?: RefObject<HTMLInputElement | null>;
  onChange(value: string): void;
}

function PasswordField({ label, value, current, error, hint, inputRef, onChange }: FieldProps) {
  const id = useId();
  const note = error ?? hint;
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={inputRef}
        id={id}
        type="password"
        value={value}
        {...(current === true
          ? { autoComplete: 'current-password' }
          : {
              autoComplete: 'new-password',
              minLength: PASSWORD_MIN_LENGTH,
              maxLength: PASSWORD_MAX_LENGTH,
            })}
        aria-invalid={error !== undefined}
        aria-describedby={note === undefined ? undefined : `${id}-note`}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {note === undefined ? null : (
        <p
          id={`${id}-note`}
          className={
            error === undefined ? 'text-muted-foreground text-xs' : 'text-destructive text-sm'
          }
        >
          {note}
        </p>
      )}
    </div>
  );
}

function PasswordForm({ onDone }: { onDone(): void }) {
  const client = useApiClient();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [problems, setProblems] = useState<Problems>({});
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus(), []);
  const change = useMutation({
    gcTime: 0,
    mutationFn: () =>
      authPasswordChange({ client, body: { currentPassword: current, newPassword: next } }),
    onSuccess: () => {
      toast(settingsText.settings_password_changed());
      onDone();
    },
    onError: (error) => {
      if (isUnauthenticated(error)) return;
      const found = serverProblems(error);
      if (found === null) toast(settingsText.settings_password_failed(), 'destructive');
      else setProblems(found);
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (change.isPending) return;
    const policy = passwordProblem(next);
    const found: Problems = {
      ...(policy === null ? {} : { next: policy }),
      ...(next === repeat ? {} : { repeat: m.reset_mismatch() }),
    };
    setProblems(found);
    if (Object.keys(found).length === 0) change.mutate();
  };
  const filled = current !== '' && next !== '' && repeat !== '';
  return (
    <form noValidate className="flex max-w-sm flex-col gap-4 px-6 py-4" onSubmit={submit}>
      {problems.form === undefined ? null : (
        <p role="alert" className="text-destructive text-sm">
          {problems.form}
        </p>
      )}
      <PasswordField
        label={settingsText.settings_password_current()}
        value={current}
        current
        error={problems.current}
        inputRef={first}
        onChange={setCurrent}
      />
      <PasswordField
        label={m.reset_password()}
        value={next}
        error={problems.next}
        hint={passwordHint()}
        onChange={setNext}
      />
      <PasswordField
        label={settingsText.settings_password_repeat()}
        value={repeat}
        error={problems.repeat}
        onChange={setRepeat}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!filled || change.isPending}>
          {change.isPending ? settingsText.settings_saving() : m.settings_save()}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {m.inbox_cancel()}
        </Button>
      </div>
    </form>
  );
}

export function PasswordCard() {
  const [open, setOpen] = useState(false);
  return (
    <SettingsCard title={m.login_password()}>
      {open ? (
        <PasswordForm onDone={() => setOpen(false)} />
      ) : (
        <SettingsRow label={m.login_password()}>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            {settingsText.settings_password_change()}
          </Button>
        </SettingsRow>
      )}
    </SettingsCard>
  );
}
