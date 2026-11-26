import { providerAppsDisable, providerAppsRegister, providerAppsReplaceSecret } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { type WorkspaceApp, type WorkspaceApps, workspaceAppsKey } from './queries.ts';

export interface AppDraft {
  readonly clientId: string;
  readonly clientSecret: string;
}

function useAppsCache(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = workspaceAppsKey(workspaceId);
  const update = (change: (items: readonly WorkspaceApp[]) => WorkspaceApp[]) =>
    queryClient.setQueryData<WorkspaceApps>(queryKey, (current) =>
      current === undefined ? current : { ...current, items: change(current.items) },
    );
  return {
    saved: (app: WorkspaceApp) =>
      update((items) => [
        app,
        ...items.filter((item) => item.provider !== app.provider || item.clientId !== app.clientId),
      ]),
    disabled: (provider: string) =>
      update((items) =>
        items.map((item) =>
          item.provider === provider && item.status !== 'disabled'
            ? { ...item, status: 'disabled' as const }
            : item,
        ),
      ),
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  };
}

export function useRegisterApp(workspaceId: string, provider: string) {
  const client = useApiClient();
  const cache = useAppsCache(workspaceId);
  return useMutation({
    mutationFn: async (draft: AppDraft) => {
      const body = {
        provider,
        clientId: draft.clientId.trim(),
        clientSecret: draft.clientSecret.trim(),
      };
      const headers = idempotency(keyFor(null, workspaceId));
      return (await providerAppsRegister({ client, path: { workspaceId }, body, headers })).data;
    },
    onSuccess: (app) => {
      cache.saved(app);
      toast(settingsText.settings_workspace_apps_registered());
    },
    onSettled: cache.refetch,
  });
}

export function useReplaceSecret(workspaceId: string, provider: string, onDone: () => void) {
  const client = useApiClient();
  const cache = useAppsCache(workspaceId);
  return useMutation({
    mutationFn: async (clientSecret: string) => {
      const path = { workspaceId, provider };
      const body = { clientSecret: clientSecret.trim() };
      const headers = idempotency(keyFor(null, `${workspaceId}:${provider}`));
      return (await providerAppsReplaceSecret({ client, path, body, headers })).data;
    },
    onSuccess: (app) => {
      cache.saved(app);
      toast(settingsText.settings_workspace_apps_secret_replaced());
      onDone();
    },
    onSettled: cache.refetch,
  });
}

export function useDisableApp(workspaceId: string, provider: string) {
  const client = useApiClient();
  const cache = useAppsCache(workspaceId);
  return useMutation({
    mutationFn: async () => {
      const headers = idempotency(keyFor(null, `${workspaceId}:${provider}`));
      await providerAppsDisable({ client, path: { workspaceId, provider }, headers });
    },
    onSuccess: () => {
      cache.disabled(provider);
      toast(settingsText.settings_workspace_apps_disabled());
    },
    onError: (error) => {
      if (errorStatus(error) !== 401) toast(apiErrorMessage(errorCode(error)), 'destructive');
    },
    onSettled: cache.refetch,
  });
}
