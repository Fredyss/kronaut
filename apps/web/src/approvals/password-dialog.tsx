import { Button, Input, Label } from '@kronaut/ui';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { m } from '../i18n.ts';

interface PasswordDialogProps {
  readonly pending: boolean;
  readonly error: string | null;
  onConfirm(password: string): void;
  onClose(): void;
}

const FOCUSABLE = 'input:not([disabled]), button:not([disabled])';

export function trapTab(event: KeyboardEvent<HTMLDivElement>): void {
  if (event.key !== 'Tab') return;
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = items[0];
  const last = items[items.length - 1];
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function PasswordDialog({ pending, error, onConfirm, onClose }: PasswordDialogProps) {
  const [password, setPassword] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const inputId = useId();
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    input.current?.focus();
    return () => opener?.focus();
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
          trapTab(event);
        }}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-background p-5 shadow-lg"
      >
        <h2 id={titleId} className="font-medium text-lg">
          {m.approval_reauth_title()}
        </h2>
        <p id={bodyId} className="text-muted-foreground text-sm">
          {m.approval_reauth_body()}
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (password !== '' && !pending) onConfirm(password);
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={inputId}>{m.login_password()}</Label>
            <Input
              ref={input}
              id={inputId}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              aria-invalid={error !== null}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />
          </div>
          {error === null ? null : (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {m.inbox_confirm_back()}
            </Button>
            <Button type="submit" disabled={pending || password === ''}>
              {m.approval_reauth_confirm()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
