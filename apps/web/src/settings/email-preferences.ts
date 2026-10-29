import {
  type Client,
  type NotificationsPreferencesResponse,
  notificationsPreferences,
  notificationsPreferencesUpdate,
} from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useApiClient } from '../context.ts';
import { m as settingsText } from '../i18n/settings.ts';
import { idempotency, type Keyed, keyFor } from '../idempotency.ts';

export type EmailPreferences = NotificationsPreferencesResponse['email'];

export function emailPreferencesKey(workspaceId: string) {
  return ['notification-preferences', workspaceId] as const;
}

export function emailPreferencesQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: emailPreferencesKey(workspaceId),
    queryFn: async () =>
      (await notificationsPreferences({ client, path: { workspaceId } })).data.email,
    staleTime: 60_000,
  });
}

export interface EmailToggle {
  readonly key: keyof EmailPreferences;
  readonly on: boolean;
}

export function useSaveEmailPreferences(workspaceId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  const { queryKey } = emailPreferencesQuery(client, workspaceId);
  const flip = ({ key, on }: EmailToggle) =>
    queryClient.setQueryData(queryKey, (old) => (old === undefined ? old : { ...old, [key]: on }));
  return useMutation({
    // One PUT at a time, each built from the cache when it starts, so overlapping toggles cannot undo each other.
    scope: { id: `notification-preferences:${workspaceId}` },
    mutationFn: async () => {
      const email = queryClient.getQueryData(queryKey);
      if (email === undefined) throw new Error('preferences not loaded');
      const body = { email };
      keyed.current = keyFor(keyed.current, JSON.stringify(body));
      const headers = idempotency(keyed.current);
      return (
        await notificationsPreferencesUpdate({ client, path: { workspaceId }, body, headers })
      ).data.email;
    },
    onMutate: async (toggle: EmailToggle) => {
      await queryClient.cancelQueries({ queryKey });
      flip(toggle);
    },
    onSuccess: () => {
      keyed.current = null;
    },
    onError: (_error, toggle) => {
      flip({ key: toggle.key, on: !toggle.on });
      toast(settingsText.settings_email_failed(), 'destructive');
    },
  });
}
