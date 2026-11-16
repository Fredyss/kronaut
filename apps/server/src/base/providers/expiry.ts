import type { RefreshKind } from '@kronaut/core';

const BY_REFRESH_TOKEN: Readonly<Record<RefreshKind, boolean>> = {
  none: false,
  self_refresh: false,
  reusable: true,
  rotating: true,
  single_use: true,
};

export function limitedByRefreshToken(kind: RefreshKind): boolean {
  return BY_REFRESH_TOKEN[kind];
}
