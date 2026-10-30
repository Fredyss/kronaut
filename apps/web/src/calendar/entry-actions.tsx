import { useQueryClient } from '@tanstack/react-query';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { lazy, type ReactNode, Suspense, useMemo, useState } from 'react';
import type { PostSummary } from '../api.ts';
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
  const actions = useMemo<EntryActions>(() => {
    const open = (postId: string) =>
      navigate({
        to: '/',
        search: (current) => ({ ...current, compose: postId }),
        state: { composeHere: true },
        resetScroll: false,
      });
    return {
      role,
      show: (dialog, post) => setShown({ dialog, post }),
      duplicate: (post) => {
        void load().then((module) =>
          module.duplicatePost({ client, queryClient, workspaceId, postId: post.id, open }),
        );
      },
      edit: (post) => void open(post.id),
    };
  }, [client, queryClient, navigate, workspaceId, role]);
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
  if (compose === undefined) return null;
  return (
    <Suspense fallback={null}>
      <ComposeDialog
        workspaceId={workspaceId}
        role={role}
        at={at}
        tz={tz}
        postId={compose === 'new' ? undefined : compose}
        onClose={() => void navigate({ search: rest, replace: true, resetScroll: false })}
      />
    </Suspense>
  );
}
