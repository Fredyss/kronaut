export interface SlotSearch {
  readonly at?: string;
  readonly tz?: string;
}

export interface ComposeSearch extends SlotSearch {
  readonly post?: string;
}

const POST_ID = /^post_[0-9a-hjkmnp-tv-z]{26}$/;
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

export function isPostId(value: unknown): value is string {
  return typeof value === 'string' && POST_ID.test(value);
}

export function slotSearch(search: Record<string, unknown>): SlotSearch {
  const { at, tz } = search;
  return {
    ...(typeof at === 'string' && LOCAL_MINUTE.test(at) ? { at } : {}),
    ...(isTimeZone(tz) ? { tz } : {}),
  };
}

export function composeSearch(search: Record<string, unknown>): ComposeSearch {
  const { post } = search;
  return { ...slotSearch(search), ...(isPostId(post) ? { post } : {}) };
}
