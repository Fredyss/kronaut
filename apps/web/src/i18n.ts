import * as en from '@kronaut/i18n/messages/en';
import { baseLocale, isLocale, type Locale, locales } from '@kronaut/i18n/runtime';

export { baseLocale, isLocale, type Locale, locales };

type Catalog = typeof en;

// Paraglide's per-locale modules type `inputs` as required even for messages that take none.
export type Messages = {
  readonly [K in keyof Catalog]: Catalog[K] extends (inputs: infer I) => infer R
    ? Partial<I> extends I
      ? (inputs?: I) => R
      : (inputs: I) => R
    : never;
};

const messages = (catalog: Catalog): Messages => catalog as Messages;

const english = messages(en);
const catalogs = new Map<Locale, Messages>([[baseLocale, english]]);

export let m: Messages = english;

function importCatalog(locale: Locale): Promise<Messages> {
  switch (locale) {
    case 'sk':
      return import('@kronaut/i18n/messages/sk').then(messages);
    case 'cs':
      return import('@kronaut/i18n/messages/cs').then(messages);
    default:
      return Promise.resolve(english);
  }
}

export function isLoaded(locale: Locale): boolean {
  return catalogs.has(locale);
}

export async function loadLocale(locale: Locale): Promise<void> {
  if (catalogs.has(locale)) return;
  catalogs.set(locale, await importCatalog(locale));
}

export function applyLocale(locale: Locale): void {
  const catalog = catalogs.get(locale);
  if (catalog === undefined) throw new Error(`locale ${locale} is not loaded`);
  m = catalog;
}

export function pickLocale(userLocale: string | undefined, languages: readonly string[]): Locale {
  if (userLocale !== undefined && isLocale(userLocale)) return userLocale;
  for (const tag of languages) {
    const primary = tag.split('-')[0]?.toLowerCase();
    if (primary !== undefined && isLocale(primary)) return primary;
  }
  return baseLocale;
}

export function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages.length > 0 ? navigator.languages : [navigator.language];
}

export function localeName(locale: Locale): string {
  switch (locale) {
    case 'sk':
      return m.locale_sk();
    case 'cs':
      return m.locale_cs();
    default:
      return m.locale_en();
  }
}

export function apiErrorMessage(code: string): string {
  switch (code) {
    case 'unauthenticated':
      return m.error_invalid_credentials();
    case 'rate_limited':
      return m.error_rate_limited();
    case 'unavailable':
      return m.error_unavailable();
    case 'forbidden':
      return m.error_forbidden();
    case 'invalid_request':
      return m.error_invalid_request();
    default:
      return m.error_generic();
  }
}
