import { rssFeedsCreate, rssFeedsDelete, rssFeedsUpdate } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { type FeedMode, rssFeedsKey } from './feeds.ts';

export interface FeedBody {
  readonly url: string;
  readonly name: string;
  readonly channelIds: readonly string[];
  readonly mode: FeedMode;
  readonly template: string;
}

function reportFailure(error: unknown): void {
  if (errorStatus(error) !== 401) toast(apiErrorMessage(errorCode(error)), 'destructive');
}

function useInvalidate(workspaceId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: rssFeedsKey(workspaceId) });
}

export function useSaveFeed(workspaceId: string, feedId: string | null, onDone: () => void) {
  const client = useApiClient();
  const settled = useInvalidate(workspaceId);
  return useMutation({
    mutationFn: async (input: FeedBody) => {
      const headers = idempotency(keyFor(null, feedId ?? workspaceId));
      const body = { ...input, channelIds: [...input.channelIds] };
      if (feedId === null) {
        await rssFeedsCreate({ client, path: { workspaceId }, body, headers });
      } else {
        await rssFeedsUpdate({ client, path: { workspaceId, feedId }, body, headers });
      }
    },
    onSuccess: () => {
      toast(settingsText.settings_feed_saved());
      onDone();
    },
    onSettled: settled,
  });
}

export function useFeedWrites(workspaceId: string, feedId: string, onDeleted: () => void) {
  const client = useApiClient();
  const settled = useInvalidate(workspaceId);
  const path = { workspaceId, feedId };
  const pause = useMutation({
    mutationFn: async (paused: boolean) => {
      const headers = idempotency(keyFor(null, feedId));
      await rssFeedsUpdate({ client, path, body: { paused }, headers });
    },
    onSuccess: (_data, paused) =>
      toast(
        paused ? settingsText.settings_feed_paused_toast() : settingsText.settings_feed_resumed(),
      ),
    onError: reportFailure,
    onSettled: settled,
  });
  const remove = useMutation({
    mutationFn: async () => {
      const headers = idempotency(keyFor(null, feedId));
      await rssFeedsDelete({ client, path, headers });
    },
    onSuccess: () => {
      toast(settingsText.settings_feed_deleted());
      onDeleted();
    },
    onError: reportFailure,
    onSettled: settled,
  });
  return { pause, remove };
}
