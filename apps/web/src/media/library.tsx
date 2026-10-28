import { Button, cn } from '@kronaut/ui';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { AssetPanel } from './panel.tsx';
import { type LibraryKind, libraryQuery } from './queries.ts';
import { MediaTile } from './tile.tsx';

const FILTERS: readonly { readonly kind: LibraryKind | null; readonly label: () => string }[] = [
  { kind: null, label: () => m.media_filter_all() },
  { kind: 'image', label: () => m.media_filter_images() },
  { kind: 'video', label: () => m.media_filter_videos() },
];

function KindFilter({
  kind,
  onChange,
}: {
  readonly kind: LibraryKind | null;
  onChange(kind: LibraryKind | null): void;
}) {
  return (
    <fieldset className="flex gap-1 rounded-lg border p-1">
      <legend className="sr-only">{m.media_filter_label()}</legend>
      {FILTERS.map((filter) => (
        <Button
          key={filter.kind ?? 'all'}
          size="sm"
          variant={filter.kind === kind ? 'secondary' : 'ghost'}
          aria-pressed={filter.kind === kind}
          className={cn(filter.kind === kind && 'font-semibold')}
          onClick={() => onChange(filter.kind)}
        >
          {filter.label()}
        </Button>
      ))}
    </fieldset>
  );
}

function EmptyState({ filtered }: { readonly filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center">
      <h2 className="font-medium text-lg">
        {filtered ? m.media_empty_filtered() : m.media_empty_title()}
      </h2>
      {filtered ? null : <p className="text-muted-foreground text-sm">{m.media_empty_body()}</p>}
    </div>
  );
}

export function MediaLibrary({ workspaceId }: { readonly workspaceId: string }) {
  const client = useApiClient();
  const [kind, setKind] = useState<LibraryKind | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const library = useInfiniteQuery(libraryQuery(client, workspaceId, kind));
  const items = library.data?.pages.flatMap((page) => page.items);
  const open = items?.find((item) => item.id === openId) ?? null;
  return (
    <>
      <KindFilter kind={kind} onChange={setKind} />
      {library.isError ? (
        <p role="alert" className="text-destructive text-sm">
          {m.error_generic()}
        </p>
      ) : null}
      {items === undefined ? null : items.length === 0 ? (
        <EmptyState filtered={kind !== null} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((asset) => (
            <MediaTile key={asset.id} asset={asset} onOpen={() => setOpenId(asset.id)} />
          ))}
        </ul>
      )}
      {library.hasNextPage ? (
        <Button
          variant="outline"
          className="self-center"
          disabled={library.isFetchingNextPage}
          onClick={() => void library.fetchNextPage()}
        >
          {m.media_load_more()}
        </Button>
      ) : null}
      {open === null ? null : (
        <AssetPanel workspaceId={workspaceId} asset={open} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}
