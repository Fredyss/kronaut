import { savedTextsCreate, savedTextsDelete, savedTextsUpdate } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorStatus } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m as settingsText } from '../i18n/settings.ts';
import { idempotency, keyFor } from '../idempotency.ts';
import { savedTextError } from './error.ts';
import { savedTextsKey } from './saved-texts.ts';

export interface SavedTextBody {
  readonly name: string;
  readonly doc: { readonly [key: string]: unknown };
}

function reportFailure(error: unknown): void {
  if (errorStatus(error) !== 401) toast(savedTextError(error), 'destructive');
}

function useInvalidate(workspaceId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: savedTextsKey(workspaceId) });
}

export function useCreateSavedText(workspaceId: string, onDone: () => void) {
  const client = useApiClient();
  const settled = useInvalidate(workspaceId);
  return useMutation({
    mutationFn: async (body: SavedTextBody) => {
      const headers = idempotency(keyFor(null, workspaceId));
      await savedTextsCreate({ client, path: { workspaceId }, body, headers });
    },
    onSuccess: () => {
      toast(settingsText.settings_saved_text_saved());
      onDone();
    },
    onError: reportFailure,
    onSettled: settled,
  });
}

export function useSavedTextWrites(
  workspaceId: string,
  savedTextId: string,
  onDeleted: () => void,
) {
  const client = useApiClient();
  const settled = useInvalidate(workspaceId);
  const path = { workspaceId, savedTextId };
  const update = useMutation({
    mutationFn: async (body: SavedTextBody) => {
      const headers = idempotency(keyFor(null, savedTextId));
      await savedTextsUpdate({ client, path, body, headers });
    },
    onSuccess: () => toast(settingsText.settings_saved_text_saved()),
    onError: reportFailure,
    onSettled: settled,
  });
  const remove = useMutation({
    mutationFn: async () => {
      const headers = idempotency(keyFor(null, savedTextId));
      await savedTextsDelete({ client, path, headers });
    },
    onSuccess: () => {
      toast(settingsText.settings_saved_text_deleted());
      onDeleted();
    },
    onError: reportFailure,
    onSettled: settled,
  });
  return { update, remove };
}
