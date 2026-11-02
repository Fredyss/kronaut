import { createContext, useContext } from 'react';
import type { Locale } from './i18n.ts';

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
