import { channelsConnectStart } from '@kronaut/sdk';
import { Button, toast } from '@kronaut/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useId, useState } from 'react';
import { type Channel, channelsQuery, connectableQuery, errorStatus, meQuery } from '../api.ts';
import {
  type ConnectRequest,
  ConnectSection,
  connectError,
  serverFieldId,
} from '../channels/connect-option.tsx';
import { DISCONNECT_ROLES, DisconnectConfirm, useDisconnect } from '../channels/disconnect.tsx';
import { SearchToasts } from '../channels/search-toasts.tsx';
import { useApiClient, useLocale } from '../context.ts';
import { httpsUrl } from '../destinations.ts';
import { m } from '../i18n.ts';
import { providerUi } from '../providers.ts';

export interface ChannelsSearch {
  readonly connected?: string;
  readonly error?: string;
}

const route = getRouteApi('/app/channels');

export function statusLabel(status: Channel['status']): string {
  switch (status) {
    case 'active':
      return m.channel_status_active();
    case 'needs_reauth':
      return m.channel_status_needs_reauth();
    case 'disabled':
      return m.channel_status_disabled();
    case 'disconnected':
      return m.channel_status_disconnected();
  }
}

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

interface CardProps {
  readonly channel: Channel;
  readonly onReconnect: (() => void) | null;
  readonly onDisconnect: (() => void) | null;
  readonly pending: boolean;
  readonly disconnecting: boolean;
}

function ChannelCard({ channel, onReconnect, onDisconnect, pending, disconnecting }: CardProps) {
  const { locale } = useLocale();
  const [confirming, setConfirming] = useState(false);
  const profile = httpsUrl(channel.profileUrl);
  const expires =
    channel.accessExpiresAt === null
      ? null
      : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
          new Date(channel.accessExpiresAt),
        );
  const healthy = channel.status === 'active';
  return (
    <li className="flex flex-wrap items-start gap-3 rounded-xl border p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-muted-foreground text-xs">{providerUi(channel.provider).name()}</span>
        <span className="truncate font-medium">{channel.displayName}</span>
        {channel.handle === null ? null : (
          <span className="truncate text-muted-foreground text-sm">{channel.handle}</span>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {profile === null ? null : (
            <a
              href={profile}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              {m.channels_open_profile()}
            </a>
          )}
          {expires === null ? null : (
            <span className="text-muted-foreground">{m.channels_expires({ date: expires })}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span
          className={
            healthy
              ? 'rounded-full bg-secondary px-2 py-0.5 text-xs'
              : 'rounded-full bg-destructive/10 px-2 py-0.5 text-destructive text-xs'
          }
        >
          {statusLabel(channel.status)}
        </span>
        {onReconnect === null ? null : (
          <Button size="sm" variant="outline" disabled={pending} onClick={onReconnect}>
            {m.channels_reconnect()}
          </Button>
        )}
        {onDisconnect === null || confirming ? null : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            {m.channels_disconnect()}
          </Button>
        )}
      </div>
      {onDisconnect === null || !confirming ? null : (
        <DisconnectConfirm
          name={channel.displayName}
          pending={disconnecting}
          onConfirm={onDisconnect}
          onClose={() => setConfirming(false)}
        />
      )}
    </li>
  );
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

  const fieldPrefix = useId();
  const providers = connectable.data?.map((provider) => provider.id);
  const reconnect = (channel: Channel): (() => void) | null => {
    if (providers === undefined) return null;
    if (channel.status !== 'needs_reauth') return null;
    const request = reconnectRequest(channel);
    if (request !== null) return () => connect.mutate({ body: request, fromForm: false });
    const field = serverFieldId(fieldPrefix, channel.provider);
    return () => document.getElementById(field)?.focus();
  };
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
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">{m.channels_title()}</h1>
        <p className="text-muted-foreground text-sm">{m.channels_subtitle()}</p>
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
        <ul className="flex flex-col gap-3">
          {channels.data.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              onReconnect={reconnect(channel)}
              onDisconnect={canDisconnect ? () => disconnect.mutate(channel) : null}
              pending={connect.isPending}
              disconnecting={disconnect.isPending}
            />
          ))}
        </ul>
      )}
      {providers === undefined ? null : (
        <ConnectSection
          providers={providers}
          pending={connect.isPending}
          connect={(body) => connect.mutate({ body, fromForm: true })}
          errorFor={errorFor}
          fieldPrefix={fieldPrefix}
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
