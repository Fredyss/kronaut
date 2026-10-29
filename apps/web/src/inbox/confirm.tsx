import { Button } from '@kronaut/ui';
import { useEffect, useId, useRef, useState } from 'react';
import { m as inboxText } from '../i18n/inbox.ts';
import { m } from '../i18n.ts';

interface ConfirmProps {
  readonly pending: boolean;
  onConfirm(): void;
  onClose(): void;
}

export function DuplicateConfirm({ pending, onConfirm, onClose }: ConfirmProps) {
  const [ticked, setTicked] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  const boxId = useId();
  useEffect(() => box.current?.focus(), []);
  return (
    <fieldset
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      className="flex flex-col gap-3 rounded-lg border border-destructive/40 p-3 text-sm"
    >
      <legend className="float-left font-medium">{inboxText.inbox_duplicate_title()}</legend>
      <p className="text-muted-foreground">{inboxText.inbox_duplicate_body()}</p>
      <div className="flex items-center gap-2">
        <input
          ref={box}
          id={boxId}
          type="checkbox"
          checked={ticked}
          onChange={(event) => setTicked(event.currentTarget.checked)}
          className="size-4 accent-primary"
        />
        <label htmlFor={boxId}>{inboxText.inbox_duplicate_ack()}</label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" disabled={!ticked || pending} onClick={onConfirm}>
          {inboxText.inbox_duplicate_confirm()}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {m.inbox_confirm_back()}
        </Button>
      </div>
    </fieldset>
  );
}
