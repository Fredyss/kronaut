import { cn } from '@kronaut/ui';
import { type ReactNode, useEffect, useRef } from 'react';

interface ModalProps {
  readonly labelledBy?: string;
  readonly label?: string;
  readonly describedBy?: string;
  readonly wide?: boolean;
  readonly fill?: boolean;
  readonly children: ReactNode;
  onCancel(): void;
}

// The native modal dialog makes the page behind it inert and keeps Tab inside, so no trap is needed.
export function Modal({
  labelledBy,
  label,
  describedBy,
  wide = false,
  fill = false,
  children,
  onCancel,
}: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const shown = useRef(false);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    shown.current = true;
    return () => {
      shown.current = false;
      if (element?.open === true) element.close();
      if (opener?.isConnected === true) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={labelledBy}
      aria-label={label}
      aria-describedby={describedBy}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClose={(event) => {
        // A repeated Escape fires a cancel the browser won't let us prevent; stay open until React unmounts us.
        if (shown.current && !event.currentTarget.open) event.currentTarget.showModal();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-xl border bg-background p-5 text-foreground shadow-lg backdrop:bg-black/40',
        wide ? 'max-h-[calc(100svh-2rem)] max-w-3xl' : 'max-w-md',
        fill && 'h-[calc(100svh-2rem)] max-w-6xl overflow-hidden p-0',
      )}
    >
      {children}
    </dialog>
  );
}
