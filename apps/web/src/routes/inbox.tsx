import { useQuery } from '@tanstack/react-query';
import { meQuery } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { InboxList } from '../inbox/list.tsx';

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
