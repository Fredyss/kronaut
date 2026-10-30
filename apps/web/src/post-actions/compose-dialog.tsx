import { Button } from '@kronaut/ui';
import { lazy, Suspense, useId } from 'react';
import { Discard, useLeaveGuard } from '../compose/leave-guard.tsx';
import { m } from '../i18n.ts';
import { Modal } from './modal.tsx';

const load = () => import('../routes/compose.tsx');
const ComposeForm = lazy(() => load().then((module) => ({ default: module.ComposeForm })));
const EditForm = lazy(() => load().then((module) => ({ default: module.EditForm })));

export interface ComposeDialogProps {
  readonly workspaceId: string;
  readonly role: string;
  readonly at: string | undefined;
  readonly tz: string | undefined;
  readonly postId: string | undefined;
  onClose(): void;
}

export function ComposeDialog(props: ComposeDialogProps) {
  const { workspaceId, role, at, tz, postId, onClose } = props;
  const titleId = useId();
  const guard = useLeaveGuard(onClose);
  const form = { workspaceId, role, onDone: guard.leave, onDirtyChange: guard.setDirty };
  return (
    <Modal labelledBy={titleId} wide onCancel={guard.close}>
      <div className="relative">
        <div inert={guard.prompt} className="flex flex-col gap-6">
          <header className="flex items-center justify-between gap-4">
            <h2 id={titleId} className="font-semibold text-xl tracking-tight">
              {postId === undefined ? m.post_new_title() : m.post_edit_title()}
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={guard.close}>
              {m.close()}
            </Button>
          </header>
          <Suspense fallback={<p className="text-muted-foreground text-sm">{m.loading()}</p>}>
            {postId === undefined ? (
              <ComposeForm {...form} at={at} tz={tz} />
            ) : (
              <EditForm {...form} postId={postId} />
            )}
          </Suspense>
        </div>
        {guard.prompt ? <Discard onKeep={guard.keep} onDiscard={guard.leave} /> : null}
      </div>
    </Modal>
  );
}
