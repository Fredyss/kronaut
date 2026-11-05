import { channelsConnectStart } from '@kronaut/sdk';
import { Button, toast } from '@kronaut/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { errorStatus } from '../../base/api/errors.ts';
import { meQuery } from '../../base/api/me.ts';
import { m } from '../../base/locale/i18n.ts';
import { providerUi } from '../../base/providers/ui.ts';
import { ANALYTICS_ROLES } from '../../records/analytics/roles.ts';
import { AddChannelDialog } from '../../records/channels/add-channel.tsx';
import { type ConnectRequest, connectError } from '../../records/channels/connect-option.tsx';
import { DISCONNECT_ROLES, useDisconnect } from '../../records/channels/disconnect.tsx';
import { type Channel, channelsQuery, connectableQuery } from '../../records/channels/queries.ts';
import { QUEUE_ROLES } from '../../records/channels/queue.ts';
import { SearchToasts } from '../../records/channels/search-toasts.tsx';
import { httpsUrl } from '../../records/posts/destinations.ts';
import { ChannelList } from './channel-card.tsx';

export interface ChannelsSearch {
  readonly connected?: string;
  readonly error?: string;
}

const route = getRouteApi('/app/channels');

const HANDLE_HOST = /^@[^@\s]+@([^@\s]+)$/;

function reconnectRequest({ provider, handle }: Channel): ConnectRequest | null {
  const ui = providerUi(provider);
  if (ui.instance) {
    const instance = handle === null ? undefined : HANDLE_HOST.exec(handle)?.[1];
    return instance === undefined ? null : { provider, instance };
  }
  return ui.loginHint && handle !== null ? { provider, loginHint: handle } : { provider };
}

interface ConnectAttempt {
  readonly body: ConnectRequest;
  readonly fromForm: boolean;
}

function fieldError(error: unknown, attempt: ConnectAttempt): string | null {
  const { text, field } = connectError(error, attempt.body);
  return field && attempt.fromForm ? text : null;
}

function useConnect(workspaceId: string) {
  const client = useApiClient();
  return useMutation({
    mutationFn: async ({ body }: ConnectAttempt) =>
      (await channelsConnectStart({ client, path: { workspaceId }, body })).data,
    onSuccess: ({ authorizationUrl }) => {
      if (httpsUrl(authorizationUrl) === null) {
        toast(m.channels_connect_bad_url(), 'destructive');
        return;
      }
      window.location.assign(authorizationUrl);
    },
    onError: (error, attempt) => {
      if (errorStatus(error) === 401 || fieldError(error, attempt) !== null) return;
      toast(connectError(error, attempt.body).text, 'destructive');
    },
  });
}

function Channels({ workspaceId, role }: { readonly workspaceId: string; readonly role: string }) {
  const client = useApiClient();
  const channels = useQuery({
    ...channelsQuery(client, workspaceId),
    select: (items) => items.filter((channel) => channel.status !== 'disconnected'),
  });
  const connectable = useQuery(connectableQuery(client, workspaceId));
  const connect = useConnect(workspaceId);
  const disconnect = useDisconnect(workspaceId);
  const canDisconnect = DISCONNECT_ROLES.has(role);
  const search = route.useSearch();
  const [adding, setAdding] = useState<{ readonly initial: string | null } | null>(null);

  const fieldPrefix = useId();
  const providers = connectable.data?.map((provider) => provider.id);
  const startReconnect = (channel: Channel): (() => void) | null => {
    if (providers === undefined) return null;
    const request = reconnectRequest(channel);
    if (request !== null) return () => connect.mutate({ body: request, fromForm: false });
    return () => setAdding({ initial: channel.provider });
  };
  const reconnect = (channel: Channel) =>
    channel.status === 'needs_reauth' ? startReconnect(channel) : null;
  const errorFor = (provider: string): string | null => {
    const attempt = connect.variables;
    if (connect.error === null || attempt?.body.provider !== provider) return null;
    return fieldError(connect.error, attempt);
  };

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      {search.connected === undefined && search.error === undefined ? null : (
        <SearchToasts channels={channels.data} />
      )}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-2xl tracking-tight">{m.channels_title()}</h1>
          <p className="text-muted-foreground text-sm">{m.channels_subtitle()}</p>
        </div>
        {providers === undefined ? null : (
          <Button onClick={() => setAdding({ initial: null })}>{m.channels_add()}</Button>
        )}
      </header>
      {channels.isError ? (
        <p role="alert" className="text-destructive text-sm">
          {m.error_generic()}
        </p>
      ) : null}
      {channels.data === undefined ? null : channels.data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center">
          <h2 className="font-medium text-lg">{m.channels_empty_title()}</h2>
          {providers === undefined ? null : (
            <p className="text-muted-foreground text-sm">{m.channels_empty_body()}</p>
          )}
        </div>
      ) : (
        <ChannelList
          channels={channels.data}
          workspaceId={workspaceId}
          cardFor={(channel) => ({
            channel,
            onReconnect: reconnect(channel),
            onAddInsights: startReconnect(channel),
            onDisconnect: canDisconnect ? () => disconnect.mutate(channel) : null,
            pending: connect.isPending,
            disconnecting: disconnect.isPending,
            queueWorkspace: QUEUE_ROLES.has(role) ? workspaceId : null,
            metricsWorkspace: ANALYTICS_ROLES.has(role) ? workspaceId : null,
          })}
        />
      )}
      {providers === undefined || adding === null ? null : (
        <AddChannelDialog
          available={providers}
          initial={adding.initial}
          pending={connect.isPending}
          connect={(body) => connect.mutate({ body, fromForm: true })}
          errorFor={errorFor}
          fieldPrefix={fieldPrefix}
          onClose={() => setAdding(null)}
        />
      )}
    </section>
  );
}

export function ChannelsPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  if (workspace === undefined) return null;
  return <Channels workspaceId={workspace.id} role={workspace.role} />;
}
