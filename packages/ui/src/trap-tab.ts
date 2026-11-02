import type { KeyboardEvent } from 'react';

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
