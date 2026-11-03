import { type AuthMeResponse, authMe, type Client } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';

export type Me = AuthMeResponse;

export const ME_KEY = ['me'] as const;

export function meQuery(client: Client) {
  return queryOptions({
    queryKey: ME_KEY,
    queryFn: async () => (await authMe({ client })).data,
    staleTime: 60_000,
  });
}
