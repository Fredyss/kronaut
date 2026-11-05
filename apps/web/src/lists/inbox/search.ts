import { brandParam } from '../../records/brands/search.ts';
import { groupParam } from '../../records/groups/search.ts';

export interface InboxSearch {
  readonly brand?: string;
  readonly group?: string;
}

export function inboxSearch(search: Record<string, unknown>): InboxSearch {
  const brand = brandParam(search.brand);
  const group = groupParam(search.group);
  return { ...(brand === undefined ? {} : { brand }), ...(group === undefined ? {} : { group }) };
}
