import { useQueryClient } from '@tanstack/react-query';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { lazy, type ReactNode, Suspense, useMemo, useState } from 'react';
import { DRAFT_ROLES, type PostSummary } from '../api.ts';
import { useApiClient } from '../context.ts';
import { type EntryActions, EntryActionsContext, type EntryDialog } from './entry-menu.tsx';

const load = () => import('../post-actions/entry-actions.tsx');
const DeleteDialog = lazy(() => load().then((module) => ({ default: module.DeleteDialog })));
const PreviewDialog = lazy(() => load().then((module) => ({ default: module.PreviewDialog })));
const ComposeDialog = lazy(() => load().then((module) => ({ default: module.ComposeDialog })));

const route = getRouteApi('/app/');

interface Shown {
  readonly dialog: EntryDialog;
  readonly post: PostSummary;
}

interface ProviderProps {
  readonly workspaceId: string;
  readonly role: string;
  readonly children: ReactNode;
}

export function EntryActionsProvider({ workspaceId, role, children }: ProviderProps) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [shown, setShown] = useState<Shown | null>(null);
  const actions = useMemo<EntryActions>(
    () => ({
      canDraft: DRAFT_ROLES.has(role),
      show: (dialog, post) => setShown({ dialog, post }),
      duplicate: (post) => {
        const open = (postId: string) => navigate({ to: '/posts/$postId', params: { postId } });
        void load().then((module) =>
          module.duplicatePost({ client, queryClient, workspaceId, postId: post.id, open }),
        );
      },
    }),
    [client, queryClient, navigate, workspaceId, role],
  );
  const close = () => setShown(null);
  return (
    <EntryActionsContext.Provider value={actions}>
      {children}
      {shown === null ? null : (
        <Suspense fallback={null}>
          {shown.dialog === 'delete' ? (
            <DeleteDialog
              workspaceId={workspaceId}
              post={shown.post}
              onClose={close}
              onDeleted={close}
            />
          ) : (
            <PreviewDialog workspaceId={workspaceId} postId={shown.post.id} onClose={close} />
          )}
        </Suspense>
      )}
    </EntryActionsContext.Provider>
  );
}

export function CalendarCompose({ workspaceId, role }: Omit<ProviderProps, 'children'>) {
  const { compose, at, tz, ...rest } = route.useSearch();
  const navigate = route.useNavigate();
  if (compose !== 'new') return null;
  const close = () => void navigate({ search: rest, replace: true });
  return (
    <Suspense fallback={null}>
      <ComposeDialog workspaceId={workspaceId} role={role} at={at} tz={tz} onClose={close} />
    </Suspense>
  );
}
