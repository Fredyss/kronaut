import { brandParam } from '../../records/brands/search.ts';

export interface InboxSearch {
  readonly brand?: string;
}

export function inboxSearch(search: Record<string, unknown>): InboxSearch {
  const brand = brandParam(search.brand);
  return brand === undefined ? {} : { brand };
}
