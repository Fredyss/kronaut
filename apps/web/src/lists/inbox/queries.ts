import {
  type Client,
  type DestinationsNeedsActionResponse,
  destinationsNeedsAction,
} from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';

export const NEEDS_ACTION_POLL_MS = 30_000;

export type NeedsAction = DestinationsNeedsActionResponse;

export type NeedsActionItem = NeedsAction['items'][number];

export function needsActionKey(workspaceId: string) {
  return ['needs-action', workspaceId] as const;
}

export interface NeedsActionFilter {
  readonly brand?: string | undefined;
  readonly group?: string | undefined;
}

export function needsActionQuery(
  client: Client,
  workspaceId: string,
  { brand, group }: NeedsActionFilter = {},
) {
  const query = {
    ...(brand === undefined ? {} : { brand }),
    ...(group === undefined ? {} : { group }),
  };
  const filtered = brand !== undefined || group !== undefined;
  return queryOptions({
    queryKey: filtered
      ? [...needsActionKey(workspaceId), brand ?? null, group ?? null]
      : needsActionKey(workspaceId),
    queryFn: async () =>
      (await destinationsNeedsAction({ client, path: { workspaceId }, query })).data,
    refetchInterval: NEEDS_ACTION_POLL_MS,
    refetchOnWindowFocus: true,
  });
}
