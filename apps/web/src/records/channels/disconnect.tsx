import { channelsDisconnect } from '@kronaut/sdk';
import { Button, toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { errorCode, errorStatus } from '../../base/api/errors.ts';
import { apiErrorMessage, m } from '../../base/locale/i18n.ts';
import { providerUi } from '../../base/providers/ui.ts';
import { type Channel, channelsQuery } from './queries.ts';

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
  readonly provider: string;
  readonly dataRetentionDays: number | null;
  readonly pending: boolean;
  onConfirm(): void;
  onClose(): void;
}

export function DisconnectConfirm(props: ConfirmProps) {
  const { name, dataRetentionDays, pending, onConfirm, onClose } = props;
  const confirm = useRef<HTMLButtonElement>(null);
  const ui = providerUi(props.provider);
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
      {ui.googleGrant === true ? (
        <p className="text-muted-foreground">{m.channels_disconnect_google()}</p>
      ) : null}
      {ui.removesWebhook === true ? (
        <p className="text-muted-foreground">{m.channels_disconnect_discord()}</p>
      ) : null}
      {ui.botStays === true ? (
        <p className="text-muted-foreground">{m.channels_disconnect_discord_bot()}</p>
      ) : null}
      {dataRetentionDays === null ? null : (
        <p className="text-muted-foreground">
          {m.channels_disconnect_data({ count: dataRetentionDays })}
        </p>
      )}
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
