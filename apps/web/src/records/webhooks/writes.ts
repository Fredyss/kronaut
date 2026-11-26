import {
  webhooksCreate,
  webhooksDelete,
  webhooksRotateSecret,
  webhooksTest,
  webhooksUpdate,
} from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as integrationsText } from '../../i18n/integrations.ts';
import { testError } from './errors.ts';
import { type WebhookEvent, webhooksKey } from './queries.ts';

interface EndpointDraft {
  readonly url: string;
  readonly events: readonly WebhookEvent[];
}

export interface Revealed {
  readonly secret: string;
  readonly previousUntil: string | null;
}

function report(message: (error: unknown) => string) {
  return (error: unknown) => {
    if (errorStatus(error) !== 401) toast(message(error), 'destructive');
  };
}

const reportFailure = report((error) => apiErrorMessage(errorCode(error)));

function useInvalidate(workspaceId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: webhooksKey(workspaceId) });
}

export function useSaveEndpoint(
  workspaceId: string,
  endpointId: string | null,
  onSaved: (revealed: Revealed | null) => void,
) {
  const client = useApiClient();
  const settled = useInvalidate(workspaceId);
  return useMutation({
    mutationFn: async (draft: EndpointDraft): Promise<Revealed | null> => {
      const body = { url: draft.url.trim(), events: [...draft.events] };
      if (endpointId === null) {
        const created = (await webhooksCreate({ client, path: { workspaceId }, body })).data;
        return { secret: created.secret, previousUntil: null };
      }
      const headers = idempotency(keyFor(null, endpointId));
      await webhooksUpdate({ client, path: { workspaceId, webhookId: endpointId }, body, headers });
      return null;
    },
    onSuccess: (revealed) => {
      toast(integrationsText.integrations_webhooks_saved());
      onSaved(revealed);
    },
    onSettled: settled,
  });
}

interface EndpointCallbacks {
  onDeleted(): void;
  onRevealed(revealed: Revealed): void;
}

export function useEndpointWrites(
  workspaceId: string,
  webhookId: string,
  { onDeleted, onRevealed }: EndpointCallbacks,
) {
  const client = useApiClient();
  const settled = useInvalidate(workspaceId);
  const path = { workspaceId, webhookId };
  const headers = () => idempotency(keyFor(null, webhookId));
  const toggle = useMutation({
    mutationFn: async (enabled: boolean) => {
      await webhooksUpdate({ client, path, body: { enabled }, headers: headers() });
    },
    onSuccess: (_data, enabled) =>
      toast(
        enabled
          ? integrationsText.integrations_webhooks_turned_on()
          : integrationsText.integrations_webhooks_turned_off(),
      ),
    onError: reportFailure,
    onSettled: settled,
  });
  const test = useMutation({
    mutationFn: async () => {
      await webhooksTest({ client, path, headers: headers() });
    },
    onSuccess: () => toast(integrationsText.integrations_webhooks_test_sent()),
    onError: report(testError),
    onSettled: settled,
  });
  const rotate = useMutation({
    mutationFn: async () => (await webhooksRotateSecret({ client, path })).data,
    onSuccess: (rotated) =>
      onRevealed({ secret: rotated.secret, previousUntil: rotated.previousSecretExpiresAt }),
    onError: reportFailure,
    onSettled: settled,
  });
  const remove = useMutation({
    mutationFn: async () => {
      await webhooksDelete({ client, path, headers: headers() });
    },
    onSuccess: () => {
      toast(integrationsText.integrations_webhooks_deleted());
      onDeleted();
    },
    onError: reportFailure,
    onSettled: settled,
  });
  return { toggle, test, rotate, remove };
}
