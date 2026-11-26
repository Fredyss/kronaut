import {
  type Client,
  type WebhooksCreateData,
  type WebhooksDeliveriesResponse,
  type WebhooksListResponse,
  webhooksDeliveries,
  webhooksList,
} from '@kronaut/sdk';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';

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
  return infiniteQueryOptions({
    queryKey: [...webhooksKey(workspaceId), 'deliveries', webhookId],
    queryFn: async ({ pageParam }) =>
      (
        await webhooksDeliveries({
          client,
          path: { workspaceId, webhookId },
          query: pageParam === null ? {} : { cursor: pageParam },
        })
      ).data,
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
}

export function endpointHost(url: string): string {
  return URL.parse(url)?.host ?? url;
}
