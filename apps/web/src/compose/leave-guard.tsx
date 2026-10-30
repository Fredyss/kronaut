import { Button } from '@kronaut/ui';
import { useBlocker } from '@tanstack/react-router';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { m } from '../i18n.ts';

function rememberFocus(): () => void {
  const element = document.activeElement;
  const selection = document.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  return () => {
    if (!(element instanceof HTMLElement) || !element.isConnected) return;
    element.focus();
    if (range === null || !element.contains(range.commonAncestorContainer)) return;
    selection?.removeAllRanges();
    selection?.addRange(range);
  };
}

export function Discard({ onKeep, onDiscard }: { onKeep(): void; onDiscard(): void }) {
  const titleId = useId();
  const bodyId = useId();
  const keep = useRef<HTMLButtonElement>(null);
  const restore = useRef(() => {});
  useLayoutEffect(() => {
    restore.current = rememberFocus();
  }, []);
  // A passive cleanup: a layout one runs while the form is still inert, and focus() does nothing.
  useEffect(() => {
    keep.current?.focus();
    return () => restore.current();
  }, []);
  return (
    <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/90 pt-16">
      <div
        role="alertdialog"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-background p-5 shadow-lg"
      >
        <h3 id={titleId} className="font-medium text-lg">
          {m.post_discard_title()}
        </h3>
        <p id={bodyId} className="text-muted-foreground text-sm">
          {m.post_discard_body()}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button ref={keep} type="button" variant="ghost" onClick={onKeep}>
            {m.post_discard_keep()}
          </Button>
          <Button type="button" variant="destructive" onClick={onDiscard}>
            {m.post_discard_confirm()}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useLeaveGuard(onClose: () => void) {
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(false);
  const guarded = useRef({ dirty: false, saving: false, leaving: false });
  guarded.current.dirty = dirty;
  guarded.current.saving = saving;
  const blocks = () =>
    (guarded.current.dirty || guarded.current.saving) && !guarded.current.leaving;
  const blocker = useBlocker({
    shouldBlockFn: blocks,
    enableBeforeUnload: blocks,
    withResolver: true,
  });
  const blocked = blocker.status === 'blocked';
  const { reset } = blocker;
  useEffect(() => {
    if (saving) reset?.();
  }, [saving, reset]);
  const prompt = asking || (blocked && !saving);
  const leave = () => {
    if (guarded.current.leaving) return;
    guarded.current.leaving = true;
    setAsking(false);
    if (blocker.status === 'blocked') blocker.proceed();
    else onClose();
  };
  const keep = () => {
    setAsking(false);
    blocker.reset?.();
  };
  const close = () => {
    if (saving) return;
    if (prompt) keep();
    else if (dirty) setAsking(true);
    else leave();
  };
  return { prompt, setDirty, setSaving, leave, keep, close };
}
