import { useSyncExternalStore } from 'react';
import { cn } from './cn.ts';

export type ToastVariant = 'default' | 'destructive';

export interface ToastItem {
  readonly id: number;
  readonly message: string;
  readonly variant: ToastVariant;
}

const DURATION_MS = 6000;

let items: readonly ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(next: readonly ToastItem[]): void {
  items = next;
  for (const listener of listeners) listener();
}

export function dismissToast(id: number): void {
  emit(items.filter((item) => item.id !== id));
}

export function toast(message: string, variant: ToastVariant = 'default'): number {
  const id = nextId++;
  emit([...items, { id, message, variant }]);
  setTimeout(() => dismissToast(id), DURATION_MS);
  return id;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = (): readonly ToastItem[] => items;

export interface ToasterProps {
  readonly dismissLabel: string;
}

export function Toaster({ dismissLabel }: ToasterProps) {
  const toasts = useSyncExternalStore(subscribe, snapshot, snapshot);
  return (
    <section
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 md:bottom-0 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role={item.variant === 'destructive' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-popover p-4 text-popover-foreground text-sm shadow-lg',
            item.variant === 'destructive' && 'border-destructive/50 text-destructive',
          )}
        >
          <p className="flex-1">{item.message}</p>
          <button
            type="button"
            className="rounded-sm text-muted-foreground text-xs hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            onClick={() => dismissToast(item.id)}
          >
            {dismissLabel}
          </button>
        </div>
      ))}
    </section>
  );
}
