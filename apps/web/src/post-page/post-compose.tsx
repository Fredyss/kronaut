import { getRouteApi } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const ComposeDialog = lazy(() =>
  import('../post-actions/entry-actions.tsx').then((module) => ({
    default: module.ComposeDialog,
  })),
);

const route = getRouteApi('/app/posts/$postId');

export function PostCompose({
  workspaceId,
  role,
  postId,
}: {
  readonly workspaceId: string;
  readonly role: string;
  readonly postId: string;
}) {
  const { compose } = route.useSearch();
  const navigate = route.useNavigate();
  if (compose === undefined) return null;
  return (
    <Suspense fallback={null}>
      <ComposeDialog
        workspaceId={workspaceId}
        role={role}
        at={undefined}
        tz={undefined}
        postId={compose}
        pagePost={postId}
        onClose={() => void navigate({ search: {}, replace: true })}
      />
    </Suspense>
  );
}
