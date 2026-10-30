import { Button } from '@kronaut/ui';
import { useBlocker } from '@tanstack/react-router';
import { useEffect, useId, useRef, useState } from 'react';
import { m } from '../i18n.ts';

export function Discard({ onKeep, onDiscard }: { onKeep(): void; onDiscard(): void }) {
  const titleId = useId();
  const bodyId = useId();
  const keep = useRef<HTMLButtonElement>(null);
  useEffect(() => keep.current?.focus(), []);
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
  const [asking, setAsking] = useState(false);
  const guarded = useRef({ dirty: false, leaving: false });
  guarded.current.dirty = dirty;
  const blocks = () => guarded.current.dirty && !guarded.current.leaving;
  const blocker = useBlocker({
    shouldBlockFn: blocks,
    enableBeforeUnload: blocks,
    withResolver: true,
  });
  const prompt = asking || blocker.status === 'blocked';
  const leave = () => {
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
    if (prompt) keep();
    else if (dirty) setAsking(true);
    else leave();
  };
  return { prompt, setDirty, leave, keep, close };
}
