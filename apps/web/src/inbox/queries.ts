import {
  type Client,
  type DestinationsNeedsActionResponse,
  destinationsNeedsAction,
} from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';
import { NEEDS_ACTION_POLL_MS } from '../posts/destinations.ts';

export type NeedsAction = DestinationsNeedsActionResponse;

export type NeedsActionItem = NeedsAction['items'][number];

export function needsActionKey(workspaceId: string) {
  return ['needs-action', workspaceId] as const;
}

export function needsActionQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: needsActionKey(workspaceId),
    queryFn: async () => (await destinationsNeedsAction({ client, path: { workspaceId } })).data,
    refetchInterval: NEEDS_ACTION_POLL_MS,
    refetchOnWindowFocus: true,
  });
}
