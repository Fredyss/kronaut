import {
  type Client,
  type WebhooksCreateData,
  type WebhooksDeliveriesResponse,
  type WebhooksListResponse,
  webhooksDeliveries,
  webhooksList,
} from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';
import { cursorPagesQuery } from '../../base/api/cursor-pages.ts';

export type Endpoint = WebhooksListResponse['items'][number];
export type Delivery = WebhooksDeliveriesResponse['items'][number];
export type WebhookEvent = WebhooksCreateData['body']['events'][number];

export const ENDPOINT_URL_MAX = 2048;

export function webhooksKey(workspaceId: string) {
  return ['webhooks', workspaceId] as const;
}

export function webhooksQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: [...webhooksKey(workspaceId), 'list'],
    queryFn: async () => (await webhooksList({ client, path: { workspaceId } })).data.items,
  });
}

export function deliveriesQuery(client: Client, workspaceId: string, webhookId: string) {
  return cursorPagesQuery(
    [...webhooksKey(workspaceId), 'deliveries', webhookId],
    async (query) =>
      (await webhooksDeliveries({ client, path: { workspaceId, webhookId }, query })).data,
  );
}

export function endpointHost(url: string): string {
  return URL.parse(url)?.host ?? url;
}
