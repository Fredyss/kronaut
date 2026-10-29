import { cn } from '@kronaut/ui';
import { type ReactNode, useEffect, useRef } from 'react';

interface ModalProps {
  readonly labelledBy?: string;
  readonly label?: string;
  readonly describedBy?: string;
  readonly wide?: boolean;
  readonly children: ReactNode;
  onCancel(): void;
}

// The native modal dialog makes the page behind it inert and keeps Tab inside, so no trap is needed.
export function Modal({
  labelledBy,
  label,
  describedBy,
  wide = false,
  children,
  onCancel,
}: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => {
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
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-xl border bg-background p-5 text-foreground shadow-lg backdrop:bg-black/40',
        wide ? 'max-h-[calc(100svh-2rem)] max-w-3xl' : 'max-w-md',
      )}
    >
      {children}
    </dialog>
  );
}
