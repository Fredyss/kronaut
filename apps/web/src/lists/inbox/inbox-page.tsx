import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useApiClient } from '../../base/api/client.ts';
import { meQuery } from '../../base/api/me.ts';
import { m } from '../../base/locale/i18n.ts';
import { BrandFilter } from '../../records/brands/brand-filter.tsx';
import { InboxList } from './list.tsx';

const route = getRouteApi('/app/inbox');

export function InboxPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  const { brand } = route.useSearch();
  const navigate = route.useNavigate();
  const choose = (next: string | undefined) =>
    void navigate({ to: '/inbox', search: next === undefined ? {} : { brand: next } });
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-semibold text-2xl tracking-tight">{m.nav_inbox()}</h1>
        {workspace === undefined ? null : (
          <BrandFilter workspaceId={workspace.id} brand={brand} onChange={choose} />
        )}
      </header>
      {workspace === undefined ? null : <InboxList workspaceId={workspace.id} brand={brand} />}
    </section>
  );
}
