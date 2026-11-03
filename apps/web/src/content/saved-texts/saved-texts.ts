import { type Client, type SavedTextsListResponse, savedTextsList } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';

export type SavedText = SavedTextsListResponse['items'][number];

export const SAVED_TEXT_NAME_MAX = 60;
export const SAVED_TEXT_MAX = 2000;

export function savedTextsKey(workspaceId: string) {
  return ['saved-texts', workspaceId] as const;
}

export function savedTextsQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: savedTextsKey(workspaceId),
    queryFn: async () => (await savedTextsList({ client, path: { workspaceId } })).data.items,
  });
}
