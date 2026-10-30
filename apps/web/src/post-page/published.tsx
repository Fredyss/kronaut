import { Button, buttonVariants } from '@kronaut/ui';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { lazy, type ReactNode, Suspense, useState } from 'react';
import { ANALYTICS_ID, useMetricsRows } from '../analytics/section.tsx';
import { ANALYTICS_ROLES, type Post } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { canDelete, canDuplicate } from '../post-actions/permissions.ts';

const load = () => import('../post-actions/entry-actions.tsx');
const PostPreview = lazy(() => load().then((module) => ({ default: module.PostPreview })));
const DeleteDialog = lazy(() => load().then((module) => ({ default: module.DeleteDialog })));

const SETTLED: ReadonlySet<string> = new Set(['published', 'unconfirmed']);

export function isSettled(post: Post): boolean {
  return post.destinations.some((destination) => SETTLED.has(destination.state));
}

interface PublishedProps {
  readonly workspaceId: string;
  readonly post: Post;
  readonly role: string;
  readonly time: string;
  readonly content: ReactNode;
}

function useDuplicate(workspaceId: string, postId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const run = async () => {
    setPending(true);
    const open = (post: string) =>
      navigate({
        to: '/posts/$postId',
        params: { postId },
        search: { compose: post },
        state: { composeHere: true },
        resetScroll: false,
      });
    const module = await load();
    await module.duplicatePost({ client, queryClient, workspaceId, postId, open });
    setPending(false);
  };
  return { pending, run: () => void run() };
}

export function PublishedView({ workspaceId, post, role, time, content }: PublishedProps) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const duplicate = useDuplicate(workspaceId, post.id);
  const stats = useMetricsRows(workspaceId, post, ANALYTICS_ROLES.has(role)).length > 0;
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <article className="flex flex-col gap-3 rounded-xl border p-4">{content}</article>
        <Suspense fallback={null}>
          <PostPreview workspaceId={workspaceId} post={post} stacked />
        </Suspense>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-auto text-muted-foreground text-sm">{time}</span>
        {stats ? (
          <Link
            to="/posts/$postId"
            params={{ postId: post.id }}
            hash={ANALYTICS_ID}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            {m.post_action_stats()}
          </Link>
        ) : null}
        {canDuplicate(role) ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={duplicate.pending}
            onClick={duplicate.run}
          >
            {m.post_action_duplicate()}
          </Button>
        ) : null}
        {canDelete(role, post.destinations) ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setDeleting(true)}>
            {m.post_action_delete()}
          </Button>
        ) : null}
      </div>
      {deleting ? (
        <Suspense fallback={null}>
          <DeleteDialog
            workspaceId={workspaceId}
            post={post}
            onClose={() => setDeleting(false)}
            onDeleted={() => void navigate({ to: '/' })}
          />
        </Suspense>
      ) : null}
    </>
  );
}
