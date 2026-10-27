import { buttonVariants } from '@kronaut/ui';
import { useEffect } from 'react';
import { m } from '../i18n.ts';
import type { Moved } from './move.ts';

const UNDO_MS = 8000;

export interface UndoNoticeProps {
  readonly moved: Moved | null;
  readonly when: string;
  onUndo(moved: Moved): void;
  onDismiss(): void;
}

export function UndoNotice({ moved, when, onUndo, onDismiss }: UndoNoticeProps) {
  useEffect(() => {
    if (moved === null) return;
    const timer = setTimeout(onDismiss, UNDO_MS);
    return () => clearTimeout(timer);
  }, [moved, onDismiss]);
  return (
    <section
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 md:bottom-0 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {moved === null ? null : (
        <div
          role="status"
          className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border bg-popover p-4 text-popover-foreground text-sm shadow-lg"
        >
          <p className="flex-1">{m.calendar_moved({ when })}</p>
          <button
            type="button"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
            onClick={() => {
              onDismiss();
              onUndo(moved);
            }}
          >
            {m.calendar_undo()}
          </button>
          <button
            type="button"
            className="rounded-sm text-muted-foreground text-xs hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            onClick={onDismiss}
          >
            {m.dismiss()}
          </button>
        </div>
      )}
    </section>
  );
}
