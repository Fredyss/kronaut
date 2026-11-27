import { type Client, type GrantsListResponse, grantsList } from '@kronaut/sdk';
import { cursorPagesQuery } from '../../base/api/cursor-pages.ts';

export type ApiKey = GrantsListResponse['items'][number];

export const API_KEY_NAME_MAX = 120;
export const RATE_LIMIT_MAX = 6000;
export const DEFAULT_RATE_LIMIT = 300;

export function apiKeysKey(workspaceId: string) {
  return ['api-keys', workspaceId] as const;
}

export function apiKeysQuery(client: Client, workspaceId: string) {
  return cursorPagesQuery(
    apiKeysKey(workspaceId),
    async (query) => (await grantsList({ client, path: { workspaceId }, query })).data,
  );
}
