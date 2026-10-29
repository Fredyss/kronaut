import { baseLocale, type Locale, type MessagesOf, registerRouteCatalogs } from '../i18n.ts';

type Importers<C> = Readonly<Record<Exclude<Locale, typeof baseLocale>, () => Promise<C>>>;

export async function routeMessages<C extends object>(
  english: C,
  importers: Importers<C>,
): Promise<MessagesOf<C>> {
  const catalogs = new Map<Locale, C>([[baseLocale, english]]);
  const live: C = { ...english };
  await registerRouteCatalogs({
    has: (locale) => catalogs.has(locale),
    load: async (locale) => {
      if (locale === baseLocale || catalogs.has(locale)) return;
      catalogs.set(locale, await importers[locale]());
    },
    apply: (locale) => {
      Object.assign(live, catalogs.get(locale));
    },
  });
  return live as MessagesOf<C>;
}
