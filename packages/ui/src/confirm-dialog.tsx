import { type ReactNode, useEffect, useId, useRef } from 'react';
import { Button, type ButtonProps } from './button.tsx';

export interface ConfirmProps {
  readonly title: string;
  readonly body: ReactNode;
  readonly keepLabel: string;
  readonly confirmLabel: string;
  readonly pending: boolean;
  readonly tone?: ButtonProps['variant'];
  onCancel(): void;
  onConfirm(): void;
}

export function ConfirmDialog({
  title,
  body,
  keepLabel,
  confirmLabel,
  pending,
  tone = 'default',
  onCancel,
  onConfirm,
}: ConfirmProps) {
  const titleId = useId();
  const bodyId = useId();
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    keep.current?.focus();
    return () => {
      if (opener?.isConnected === true) opener.focus();
    };
  }, []);
  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel();
      }}
      className="flex basis-full flex-col gap-3 rounded-md border p-4"
    >
      <h3 id={titleId} className="font-medium text-sm">
        {title}
      </h3>
      <p id={bodyId} className="text-muted-foreground text-sm">
        {body}
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button ref={keep} type="button" variant="ghost" onClick={onCancel}>
          {keepLabel}
        </Button>
        <Button type="button" variant={tone} disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
