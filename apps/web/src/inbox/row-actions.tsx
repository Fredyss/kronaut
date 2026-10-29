import { Button } from '@kronaut/ui';
import { useEffect, useRef, useState } from 'react';
import type { NeedsActionItem } from '../api.ts';
import { m as inboxText } from '../i18n/inbox.ts';
import { m } from '../i18n.ts';
import { actionsFor, type ResolveKind, useResolve } from './actions.ts';
import { DuplicateConfirm } from './confirm.tsx';

function actionLabel(kind: ResolveKind, state: NeedsActionItem['state']): string {
  if (kind === 'send') return inboxText.inbox_send_again();
  if (kind === 'cancel') return m.inbox_cancel();
  return state === 'awaiting_manual'
    ? inboxText.inbox_mark_done()
    : inboxText.inbox_mark_published();
}

interface RowActionsProps {
  readonly workspaceId: string;
  readonly item: NeedsActionItem;
  readonly describedBy: string;
}

export function RowActions({ workspaceId, item, describedBy }: RowActionsProps) {
  const { run, pending } = useResolve(workspaceId, item);
  const [confirming, setConfirming] = useState(false);
  const sendButton = useRef<HTMLButtonElement>(null);
  const restore = useRef(false);
  useEffect(() => {
    if (confirming || pending || !restore.current) return;
    restore.current = false;
    sendButton.current?.focus();
  });
  const close = () => {
    restore.current = true;
    setConfirming(false);
  };
  const sendAgain = async (acknowledge: boolean) => {
    const outcome = await run({ kind: 'send', acknowledge });
    if (outcome === 'duplicate_risk') setConfirming(true);
    else if (acknowledge) close();
  };
  const choose = (kind: ResolveKind) => {
    if (kind !== 'send') void run({ kind, acknowledge: false });
    else if (item.state === 'unconfirmed') setConfirming(true);
    else void sendAgain(false);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {actionsFor(item.state).map((kind) => (
          <Button
            key={kind}
            ref={kind === 'send' ? sendButton : undefined}
            size="sm"
            variant={kind === 'cancel' ? 'ghost' : 'outline'}
            aria-describedby={describedBy}
            disabled={pending}
            onClick={() => choose(kind)}
          >
            {actionLabel(kind, item.state)}
          </Button>
        ))}
      </div>
      {confirming ? (
        <DuplicateConfirm
          pending={pending}
          onConfirm={() => void sendAgain(true)}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
