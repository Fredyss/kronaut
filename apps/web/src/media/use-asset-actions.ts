import { toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { errorCode, errorStatus } from '../api.ts';
import { useApiClient } from '../context.ts';
import { apiErrorMessage, m } from '../i18n.ts';
import { clearAiLabel, deleteAsset, libraryKey, saveAltText } from './queries.ts';

function failure(error: unknown): string | null {
  if (errorStatus(error) === 401) return null;
  const code = errorCode(error);
  return code === 'media_in_use' ? m.media_in_use_error() : apiErrorMessage(code);
}

export function useAssetActions(workspaceId: string, mediaId: string, onDeleted: () => void) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const ref = { client, workspaceId, mediaId };
  const refresh = () => queryClient.invalidateQueries({ queryKey: libraryKey(workspaceId) });
  const onError = (error: unknown) => {
    const text = failure(error);
    if (text !== null) toast(text, 'destructive');
  };
  const alt = useMutation({
    mutationFn: (altText: string) => saveAltText(ref, altText),
    onSuccess: async () => {
      toast(m.media_alt_saved());
      await refresh();
    },
    onError,
  });
  const clearAi = useMutation({
    mutationFn: () => clearAiLabel(ref),
    onSuccess: async () => {
      toast(m.media_ai_removed());
      await refresh();
    },
    onError: (error) => {
      if (errorCode(error) !== 'conflict') onError(error);
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteAsset(ref),
    onSuccess: async () => {
      toast(m.media_deleted());
      onDeleted();
      await refresh();
    },
    onError,
  });
  return { alt, clearAi, remove };
}

export type AssetActions = ReturnType<typeof useAssetActions>;
