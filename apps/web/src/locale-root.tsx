import type { Client } from '@kronaut/sdk';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { AppRouter } from './app.tsx';
import { LocaleContext } from './context.ts';
import { applyLocale, baseLocale, isLoaded, type Locale, loadLocale } from './i18n.ts';
import { useLocaleChoice } from './locale-choice.ts';

interface LocaleRootProps {
  readonly router: AppRouter;
  readonly client: Client;
}

export function LocaleRoot({ router, client }: LocaleRootProps) {
  const { wanted, choose } = useLocaleChoice(client);
  const [locale, setLocale] = useState<Locale | null>(null);
  if (locale !== wanted && isLoaded(wanted)) setLocale(wanted);
  useEffect(() => {
    if (isLoaded(wanted)) return;
    let live = true;
    loadLocale(wanted).then(
      () => {
        if (live) setLocale(wanted);
      },
      () => {
        if (live) setLocale((current) => current ?? baseLocale);
      },
    );
    return () => {
      live = false;
    };
  }, [wanted]);
  useEffect(() => {
    if (locale !== null) document.documentElement.lang = locale;
  }, [locale]);
  if (locale === null) return null;
  applyLocale(locale);
  return (
    <LocaleContext value={{ locale, choose }}>
      <RouterProvider key={locale} router={router} />
    </LocaleContext>
  );
}
