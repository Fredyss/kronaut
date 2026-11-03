import type { Client } from '@kronaut/sdk';
import { createContext, useContext } from 'react';

export const ApiClientContext = createContext<Client | null>(null);

export function useApiClient(): Client {
  const client = useContext(ApiClientContext);
  if (client === null) throw new Error('useApiClient needs an ApiClientContext provider');
  return client;
}
