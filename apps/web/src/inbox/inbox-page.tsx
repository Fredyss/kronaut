import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/client.ts';
import { meQuery } from '../api/me.ts';
import { m } from '../locale/i18n.ts';
import { InboxList } from './list.tsx';

export function InboxPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="font-semibold text-2xl tracking-tight">{m.nav_inbox()}</h1>
      {workspace === undefined ? null : <InboxList workspaceId={workspace.id} />}
    </section>
  );
}
