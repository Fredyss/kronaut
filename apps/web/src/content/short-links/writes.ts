import { linkShortenerConnect, linkShortenerRemove, linkShortenerUpdate } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { type Shortener, type ShortenerProvider, shortenerKey } from './queries.ts';

export interface ShortenerDraft {
  readonly provider: ShortenerProvider;
  readonly baseUrl: string;
  readonly domain: string;
  readonly apiKey: string;
}

function useStore(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = shortenerKey(workspaceId);
  return {
    put: (shortener: Shortener | null) => queryClient.setQueryData(queryKey, shortener),
    settled: () => queryClient.invalidateQueries({ queryKey }),
  };
}

function shared(draft: ShortenerDraft) {
  const domain = draft.domain.trim();
  return {
    ...(draft.provider === 'kutt' ? { baseUrl: draft.baseUrl.trim() } : {}),
    domain: domain === '' ? null : domain,
  };
}

export function useSaveShortener(workspaceId: string, connected: boolean, onDone: () => void) {
  const client = useApiClient();
  const store = useStore(workspaceId);
  return useMutation({
    mutationFn: async (draft: ShortenerDraft): Promise<Shortener> => {
      const headers = idempotency(keyFor(null, workspaceId));
      const path = { workspaceId };
      const apiKey = draft.apiKey.trim();
      if (connected) {
        const body = { ...shared(draft), ...(apiKey === '' ? {} : { apiKey }) };
        return (await linkShortenerUpdate({ client, path, body, headers })).data;
      }
      const body = { ...shared(draft), provider: draft.provider, apiKey };
      return (await linkShortenerConnect({ client, path, body, headers })).data;
    },
    onSuccess: (shortener) => {
      store.put(shortener);
      toast(
        connected
          ? settingsText.settings_short_links_saved()
          : settingsText.settings_short_links_connected(),
      );
      onDone();
    },
    onSettled: store.settled,
  });
}

export function useRemoveShortener(workspaceId: string, onDone: () => void) {
  const client = useApiClient();
  const store = useStore(workspaceId);
  return useMutation({
    mutationFn: async () => {
      const headers = idempotency(keyFor(null, workspaceId));
      await linkShortenerRemove({ client, path: { workspaceId }, headers });
    },
    onSuccess: () => {
      store.put(null);
      toast(settingsText.settings_short_links_removed());
      onDone();
    },
    onError: (error) => {
      if (errorStatus(error) !== 401) toast(apiErrorMessage(errorCode(error)), 'destructive');
    },
    onSettled: store.settled,
  });
}
