const BRAND_ID = /^brand_[0-9a-hjkmnp-tv-z]{26}$/;

export const NO_BRAND = 'none';

export function brandParam(value: unknown): string | undefined {
  return typeof value === 'string' && (value === NO_BRAND || BRAND_ID.test(value))
    ? value
    : undefined;
}
