import { authMeUpdate, type Client } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type Me, meQuery } from './api.ts';
import { browserLanguages, type Locale, m, pickLocale } from './i18n.ts';

interface LocaleChoice {
  readonly wanted: Locale;
  choose(locale: Locale): void;
}

interface Change {
  readonly locale: Locale;
  readonly previous: string;
}

export function useLocaleChoice(client: Client): LocaleChoice {
  const queryClient = useQueryClient();
  const { queryKey } = meQuery(client);
  const me = useQuery({ ...meQuery(client), enabled: false }).data;
  const [chosen, setChosen] = useState<Locale | null>(null);
  const setUserLocale = (locale: string) =>
    queryClient.setQueryData(queryKey, (old: Me | undefined) =>
      old === undefined ? old : { ...old, user: { ...old.user, locale } },
    );
  const save = useMutation({
    mutationFn: ({ locale }: Change) => authMeUpdate({ client, body: { locale } }),
    onError: (_error, { locale, previous }) => {
      queryClient.setQueryData(queryKey, (old: Me | undefined) =>
        old?.user.locale === locale ? { ...old, user: { ...old.user, locale: previous } } : old,
      );
      toast(m.locale_save_failed(), 'destructive');
    },
  });
  return {
    wanted: chosen ?? pickLocale(me?.user.locale, browserLanguages()),
    choose: (locale) => {
      if (me === undefined) {
        setChosen(locale);
        return;
      }
      void queryClient.cancelQueries({ queryKey });
      setUserLocale(locale);
      setChosen(null);
      save.mutate({ locale, previous: me.user.locale });
    },
  };
}
