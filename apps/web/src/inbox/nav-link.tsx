import { useQuery } from '@tanstack/react-query';
import { needsActionQuery } from '../api.ts';
import { useApiClient } from '../context.ts';
import { CountBadge } from '../count-badge.tsx';
import { m } from '../i18n.ts';

export function InboxBadge({ workspaceId }: { readonly workspaceId: string }) {
  const client = useApiClient();
  const total = useQuery({
    ...needsActionQuery(client, workspaceId),
    select: (data) => data.total,
  }).data;
  if (total === undefined || total <= 0) return null;
  return (
    <>
      <span className="absolute -top-1.5 left-3">
        <CountBadge count={total} />
      </span>
      <span className="sr-only">{m.inbox_badge({ count: total })}</span>
    </>
  );
}
