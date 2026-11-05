const GROUP_ID = /^grp_[0-9a-hjkmnp-tv-z]{26}$/;

export function groupParam(value: unknown): string | undefined {
  return typeof value === 'string' && GROUP_ID.test(value) ? value : undefined;
}
