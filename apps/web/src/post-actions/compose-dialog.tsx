import { Button } from '@kronaut/ui';
import { useRouter } from '@tanstack/react-router';
import { lazy, Suspense, useId, useRef } from 'react';
import type { Post } from '../api.ts';
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
  readonly pagePost?: string;
  onClose(): void;
}

function useClosing(pagePost: string | undefined, onClose: () => void) {
  const router = useRouter();
  const saved = useRef<Post | null>(null);
  const guard = useLeaveGuard(() => {
    const post = saved.current;
    if (post !== null && pagePost !== undefined && post.id !== pagePost) {
      void router.navigate({ to: '/posts/$postId', params: { postId: post.id }, replace: true });
    } else if (router.state.location.state.composeHere === true) window.history.back();
    else onClose();
  });
  const onDone = (post: Post) => {
    saved.current = post;
    guard.leave();
  };
  return { guard, onDone };
}

export function ComposeDialog(props: ComposeDialogProps) {
  const { workspaceId, role, at, tz, postId, pagePost, onClose } = props;
  const titleId = useId();
  const { guard, onDone } = useClosing(pagePost, onClose);
  const form = {
    workspaceId,
    role,
    onDone,
    onDirtyChange: guard.setDirty,
    onPendingChange: guard.setSaving,
  };
  return (
    <Modal labelledBy={titleId} fill onCancel={guard.close}>
      <div className="relative flex h-full flex-col">
        <div inert={guard.prompt} className="flex min-h-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3">
            <h2 id={titleId} className="font-semibold text-xl tracking-tight">
              {postId === undefined ? m.post_new_title() : m.post_edit_title()}
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={guard.close}>
              {m.close()}
            </Button>
          </header>
          <Suspense fallback={<p className="p-5 text-muted-foreground text-sm">{m.loading()}</p>}>
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
