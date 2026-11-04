import { channelsSetShortenLinks } from '@kronaut/sdk';
import { Switch, toast } from '@kronaut/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { meQuery } from '../../base/api/me.ts';
import { apiErrorMessage, m } from '../../base/locale/i18n.ts';
import { type Channel, channelsKey } from '../../records/channels/queries.ts';
import { QUEUE_ROLES } from '../../records/channels/queue.ts';
import { shortenerQuery } from './queries.ts';

function useSetShortenLinks(workspaceId: string, channelId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shortenLinks: boolean) => {
      const headers = idempotency(keyFor(null, channelId));
      const path = { workspaceId, channelId };
      await channelsSetShortenLinks({ client, path, body: { shortenLinks }, headers });
    },
    onSuccess: (_data, on) =>
      toast(on ? m.channels_shorten_links_on() : m.channels_shorten_links_off()),
    onError: (error) => {
      if (errorStatus(error) !== 401) toast(apiErrorMessage(errorCode(error)), 'destructive');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: channelsKey(workspaceId) }),
  });
}

function ShortenSwitch({ workspaceId, channel }: { workspaceId: string; channel: Channel }) {
  const client = useApiClient();
  const labelId = useId();
  const shortener = useQuery(shortenerQuery(client, workspaceId)).data;
  const save = useSetShortenLinks(workspaceId, channel.id);
  if (shortener == null) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span id={labelId} className="text-muted-foreground">
        {m.channels_shorten_links()}
      </span>
      <Switch
        aria-labelledby={labelId}
        checked={save.isPending ? save.variables : channel.shortenLinks}
        disabled={save.isPending}
        onCheckedChange={(on) => save.mutate(on)}
      />
    </div>
  );
}

export function ChannelShortenLinks({ channel }: { readonly channel: Channel }) {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  if (workspace === undefined || !QUEUE_ROLES.has(workspace.role)) return null;
  return <ShortenSwitch workspaceId={workspace.id} channel={channel} />;
}
