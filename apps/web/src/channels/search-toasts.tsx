import { toast } from '@kronaut/ui';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import type { Channel } from '../api.ts';
import { useLocale } from '../context.ts';
import { m } from '../i18n.ts';

const route = getRouteApi('/app/channels');

interface CallbackSearch {
  readonly connected: string | undefined;
  readonly error: string | undefined;
}

const CALLBACK_ERRORS: Readonly<Record<string, () => string>> = {
  state_invalid: () => m.channels_error_state_invalid(),
  session_mismatch: () => m.channels_error_session_mismatch(),
  forbidden: () => m.channels_error_forbidden(),
  provider_denied: () => m.channels_error_provider_denied(),
  provider_error: () => m.channels_error_provider_error(),
  app_config: () => m.channels_error_app_config(),
  no_accounts: () => m.channels_error_no_accounts(),
  too_many_accounts: () => m.channels_error_too_many_accounts({ max: 100 }),
  server_error: () => m.channels_error_server_error(),
};

function callbackError(code: string): string {
  const message = Object.hasOwn(CALLBACK_ERRORS, code) ? CALLBACK_ERRORS[code] : undefined;
  return message === undefined ? m.channels_error_generic() : message();
}

function searchToastKey(
  { connected, error }: CallbackSearch,
  channels: readonly Channel[] | undefined,
): string | null {
  if (connected === undefined && error === undefined) return null;
  if (connected !== undefined && channels === undefined) return null;
  return `${connected ?? ''}|${error ?? ''}`;
}

function connectedToast(
  connected: string,
  channels: readonly Channel[] | undefined,
  locale: string,
): string {
  const names: string[] = [];
  for (const id of connected.split(',')) {
    const account = channels?.find((channel) => channel.id === id);
    if (account === undefined) return m.channels_connected();
    names.push(account.displayName);
  }
  const [only] = names;
  if (names.length === 1 && only !== undefined) return m.channels_connected_named({ name: only });
  return m.channels_connected_list({ names: new Intl.ListFormat(locale).format(names) });
}

function showSearchToasts(
  { connected, error }: CallbackSearch,
  channels: readonly Channel[] | undefined,
  locale: string,
) {
  if (error !== undefined) toast(callbackError(error), 'destructive');
  if (connected !== undefined) toast(connectedToast(connected, channels, locale));
}

export function SearchToasts({ channels }: { readonly channels: readonly Channel[] | undefined }) {
  const { connected, error } = route.useSearch();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const shown = useRef<string | null>(null);
  useEffect(() => {
    const search = { connected, error };
    const key = searchToastKey(search, channels);
    if (key === null) return;
    if (shown.current === key) return;
    shown.current = key;
    showSearchToasts(search, channels, locale);
    void navigate({ to: '/channels', search: {}, replace: true });
  }, [connected, error, channels, locale, navigate]);
  return null;
}
