import { useQuery } from '@tanstack/react-query';
import { meQuery } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { MediaLibrary } from '../media/library.tsx';

export function MediaPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">{m.media_title()}</h1>
        <p className="text-muted-foreground text-sm">{m.media_subtitle()}</p>
      </header>
      {workspace === undefined ? null : <MediaLibrary workspaceId={workspace.id} />}
    </section>
  );
}
