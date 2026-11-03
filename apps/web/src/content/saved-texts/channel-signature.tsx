import { channelsSetSignature } from '@kronaut/sdk';
import { Select, toast } from '@kronaut/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { meQuery } from '../../base/api/me.ts';
import { apiErrorMessage, m } from '../../base/locale/i18n.ts';
import { type Channel, channelsKey } from '../../records/channels/queries.ts';
import { QUEUE_ROLES } from '../../records/channels/queue.ts';
import { savedTextsKey, savedTextsQuery } from './saved-texts.ts';

interface SignatureSelectProps {
  readonly workspaceId: string;
  readonly channel: Channel;
}

function useSetSignature(workspaceId: string, channelId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (savedTextId: string | null) => {
      const headers = idempotency(keyFor(null, channelId));
      const path = { workspaceId, channelId };
      await channelsSetSignature({ client, path, body: { savedTextId }, headers });
    },
    onSuccess: () => toast(m.channels_signature_saved()),
    onError: (error) => {
      if (errorStatus(error) !== 401) toast(apiErrorMessage(errorCode(error)), 'destructive');
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: channelsKey(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: savedTextsKey(workspaceId) }),
      ]),
  });
}

function SignatureSelect({ workspaceId, channel }: SignatureSelectProps) {
  const client = useApiClient();
  const id = useId();
  const texts = useQuery(savedTextsQuery(client, workspaceId)).data ?? [];
  const save = useSetSignature(workspaceId, channel.id);
  const { signature } = channel;
  const options =
    signature === null || texts.some((text) => text.id === signature.id)
      ? texts
      : [signature, ...texts];
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="text-muted-foreground">
        {m.channels_signature()}
      </label>
      <Select
        id={id}
        value={signature?.id ?? ''}
        disabled={save.isPending}
        onChange={(event) => save.mutate(event.currentTarget.value || null)}
        className="max-w-56"
      >
        <option value="">{m.channels_signature_none()}</option>
        {options.map((text) => (
          <option key={text.id} value={text.id}>
            {text.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function ChannelSignature({ channel }: { readonly channel: Channel }) {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  if (workspace !== undefined && QUEUE_ROLES.has(workspace.role)) {
    return <SignatureSelect workspaceId={workspace.id} channel={channel} />;
  }
  if (channel.signature === null) return null;
  return (
    <span className="truncate text-muted-foreground text-sm">
      {m.channels_signature_named({ name: channel.signature.name })}
    </span>
  );
}
