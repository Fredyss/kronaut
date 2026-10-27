export interface ComposeSearch {
  readonly at?: string;
}

const LOCAL_MINUTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function composeSearch(search: Record<string, unknown>): ComposeSearch {
  const { at } = search;
  return typeof at === 'string' && LOCAL_MINUTE.test(at) ? { at } : {};
}
