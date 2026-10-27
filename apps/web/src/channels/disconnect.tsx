import { channelsDisconnect } from '@kronaut/sdk';
import { Button, toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { type Channel, channelsQuery, errorCode, errorStatus } from '../api.ts';
import { useApiClient } from '../context.ts';
import { apiErrorMessage, m } from '../i18n.ts';

export const DISCONNECT_ROLES: ReadonlySet<string> = new Set(['owner', 'admin']);

export function useDisconnect(workspaceId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channel: Channel) => {
      await channelsDisconnect({ client, path: { workspaceId, channelId: channel.id } });
    },
    onSuccess: async (_data, channel) => {
      toast(m.channels_disconnected({ name: channel.displayName }));
      await queryClient.invalidateQueries({
        queryKey: channelsQuery(client, workspaceId).queryKey,
      });
    },
    onError: (error) => {
      if (errorStatus(error) === 401) return;
      toast(apiErrorMessage(errorCode(error)), 'destructive');
    },
  });
}

interface ConfirmProps {
  readonly name: string;
  readonly pending: boolean;
  onConfirm(): void;
  onClose(): void;
}

export function DisconnectConfirm({ name, pending, onConfirm, onClose }: ConfirmProps) {
  const confirm = useRef<HTMLButtonElement>(null);
  useEffect(() => confirm.current?.focus(), []);
  return (
    <fieldset
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      className="flex basis-full flex-col gap-3 rounded-lg border border-destructive/40 p-3 text-sm"
    >
      <legend className="sr-only">{m.channels_disconnect()}</legend>
      <p>{m.channels_disconnect_body({ name })}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          ref={confirm}
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={onConfirm}
        >
          {m.channels_disconnect_confirm()}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {m.inbox_cancel()}
        </Button>
      </div>
    </fieldset>
  );
}
