import { Button } from '@kronaut/ui';
import { lazy, Suspense, useId, useState } from 'react';
import { m } from '../i18n.ts';
import { Modal } from './modal.tsx';

const ComposeForm = lazy(() =>
  import('../routes/compose.tsx').then((module) => ({ default: module.ComposeForm })),
);

export interface ComposeDialogProps {
  readonly workspaceId: string;
  readonly role: string;
  readonly at: string | undefined;
  readonly tz: string | undefined;
  onClose(): void;
}

function Discard({ onKeep, onDiscard }: { onKeep(): void; onDiscard(): void }) {
  const titleId = useId();
  const bodyId = useId();
  return (
    <Modal labelledBy={titleId} describedBy={bodyId} onCancel={onKeep}>
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="font-medium text-lg">
          {m.post_discard_title()}
        </h2>
        <p id={bodyId} className="text-muted-foreground text-sm">
          {m.post_discard_body()}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onKeep}>
            {m.post_discard_keep()}
          </Button>
          <Button type="button" variant="destructive" onClick={onDiscard}>
            {m.post_discard_confirm()}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ComposeDialog({ workspaceId, role, at, tz, onClose }: ComposeDialogProps) {
  const titleId = useId();
  const [dirty, setDirty] = useState(false);
  const [asking, setAsking] = useState(false);
  const close = () => (dirty ? setAsking(true) : onClose());
  return (
    <Modal labelledBy={titleId} wide onCancel={close}>
      <div className="flex flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="font-semibold text-xl tracking-tight">
            {m.post_new_title()}
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={close}>
            {m.close()}
          </Button>
        </header>
        <Suspense fallback={<p className="text-muted-foreground text-sm">{m.loading()}</p>}>
          <ComposeForm
            workspaceId={workspaceId}
            at={at}
            tz={tz}
            role={role}
            onDone={onClose}
            onDirtyChange={setDirty}
          />
        </Suspense>
      </div>
      {asking ? <Discard onKeep={() => setAsking(false)} onDiscard={onClose} /> : null}
    </Modal>
  );
}
