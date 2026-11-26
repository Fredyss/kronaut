import { grantsCreate, grantsRevoke } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { errorCode, isUnauthenticated } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import type { CreateBody } from './draft.ts';
import { apiKeysKey } from './queries.ts';

function useInvalidate(workspaceId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: apiKeysKey(workspaceId) });
}

export function useCreateApiKey(workspaceId: string, onCreated: (token: string) => void) {
  const client = useApiClient();
  const settled = useInvalidate(workspaceId);
  return useMutation({
    mutationFn: async (body: CreateBody) =>
      (await grantsCreate({ client, path: { workspaceId }, body })).data.token,
    onSuccess: (token) => {
      toast(settingsText.settings_api_keys_created());
      onCreated(token);
    },
    onSettled: settled,
  });
}

export function useRevokeApiKey(workspaceId: string, grantId: string) {
  const client = useApiClient();
  const settled = useInvalidate(workspaceId);
  return useMutation({
    mutationFn: async () => {
      const headers = idempotency(keyFor(null, grantId));
      await grantsRevoke({ client, path: { workspaceId, grantId }, headers });
    },
    onSuccess: () => toast(settingsText.settings_api_keys_revoked()),
    onError: (error) => {
      if (!isUnauthenticated(error)) toast(apiErrorMessage(errorCode(error)), 'destructive');
    },
    onSettled: settled,
  });
}
