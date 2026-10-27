import type { Client } from '@kronaut/sdk';
import { createContext, useContext } from 'react';
import type { Locale } from './i18n.ts';

export const ApiClientContext = createContext<Client | null>(null);

export function useApiClient(): Client {
  const client = useContext(ApiClientContext);
  if (client === null) throw new Error('useApiClient needs an ApiClientContext provider');
  return client;
}

export interface LocaleState {
  readonly locale: Locale;
  choose(locale: Locale): void;
}

export const LocaleContext = createContext<LocaleState | null>(null);

export function useLocale(): LocaleState {
  const state = useContext(LocaleContext);
  if (state === null) throw new Error('useLocale needs a LocaleContext provider');
  return state;
}
