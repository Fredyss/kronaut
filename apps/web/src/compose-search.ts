export interface ComposeSearch {
  readonly at?: string;
  readonly tz?: string;
}

const LOCAL_MINUTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const ZONE_MAX = 64;

function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > ZONE_MAX) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function composeSearch(search: Record<string, unknown>): ComposeSearch {
  const { at, tz } = search;
  return {
    ...(typeof at === 'string' && LOCAL_MINUTE.test(at) ? { at } : {}),
    ...(isTimeZone(tz) ? { tz } : {}),
  };
}
