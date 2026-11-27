import { infiniteQueryOptions, type QueryKey } from '@tanstack/react-query';

interface CursorPage {
  readonly nextCursor: string | null;
}

export interface CursorQuery {
  readonly cursor?: string;
}

export function cursorPagesQuery<TPage extends CursorPage, TKey extends QueryKey>(
  queryKey: TKey,
  fetchPage: (query: CursorQuery) => Promise<TPage>,
) {
  return infiniteQueryOptions({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam === null ? {} : { cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (page: TPage) => page.nextCursor,
  });
}
