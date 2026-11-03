import {
  type Client,
  type MediaListResponse,
  type MediaUsageResponse,
  mediaClearAi,
  mediaDelete,
  mediaList,
  mediaUpdate,
  mediaUsage,
} from '@kronaut/sdk';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

export type LibraryAsset = MediaListResponse['items'][number];
export type LibraryKind = 'image' | 'video';
export type UsagePost = MediaUsageResponse['items'][number];

export function libraryKey(workspaceId: string) {
  return ['media', workspaceId] as const;
}

export function libraryQuery(client: Client, workspaceId: string, kind: LibraryKind | null) {
  return infiniteQueryOptions({
    queryKey: [...libraryKey(workspaceId), 'list', kind ?? 'all'],
    queryFn: async ({ pageParam }) =>
      (
        await mediaList({
          client,
          path: { workspaceId },
          query: {
            ...(kind === null ? {} : { kind }),
            ...(pageParam === null ? {} : { cursor: pageParam }),
          },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
}

export function usageQuery(client: Client, workspaceId: string, mediaId: string) {
  return queryOptions({
    queryKey: [...libraryKey(workspaceId), 'usage', mediaId],
    queryFn: async () => (await mediaUsage({ client, path: { workspaceId, mediaId } })).data.items,
  });
}

function key() {
  return { 'Idempotency-Key': crypto.randomUUID() };
}

export interface AssetRef {
  readonly client: Client;
  readonly workspaceId: string;
  readonly mediaId: string;
}

export async function saveAltText(ref: AssetRef, altText: string) {
  const { client, workspaceId, mediaId } = ref;
  return (
    await mediaUpdate({
      client,
      path: { workspaceId, mediaId },
      body: { altText },
      headers: key(),
    })
  ).data;
}

export async function clearAiLabel({ client, workspaceId, mediaId }: AssetRef) {
  return (await mediaClearAi({ client, path: { workspaceId, mediaId }, headers: key() })).data;
}

export async function deleteAsset({ client, workspaceId, mediaId }: AssetRef) {
  await mediaDelete({ client, path: { workspaceId, mediaId }, headers: key() });
}
