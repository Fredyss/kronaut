import {
  type Client,
  type EvergreenGetResponse,
  evergreenGet,
  evergreenMark,
  evergreenUnmark,
} from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useId, useRef } from 'react';
import { type Channel, errorCode, errorStatus, type Post, postKey } from '../api.ts';
import { useApiClient } from '../context.ts';
import { apiErrorMessage, m } from '../i18n.ts';
import { idempotency, type Keyed, keyFor } from '../idempotency.ts';

export const EVERGREEN_ROLES: ReadonlySet<string> = new Set(['owner', 'admin', 'editor']);

interface EvergreenScope {
  readonly workspaceId: string;
  readonly postId: string;
}

function evergreenQuery(client: Client, path: EvergreenScope) {
  return queryOptions({
    queryKey: ['evergreen', path.workspaceId, path.postId],
    queryFn: async () => (await evergreenGet({ client, path })).data,
  });
}

function useToggle(path: EvergreenScope) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  return useMutation({
    mutationFn: async (on: boolean): Promise<EvergreenGetResponse> => {
      keyed.current = keyFor(keyed.current, String(on));
      const headers = idempotency(keyed.current);
      const call = on ? evergreenMark : evergreenUnmark;
      return (await call({ client, path, headers })).data;
    },
    onSuccess: async (state) => {
      keyed.current = null;
      queryClient.setQueryData(evergreenQuery(client, path).queryKey, state);
      await queryClient.invalidateQueries({ queryKey: postKey(path.workspaceId, path.postId) });
    },
    onError: (error) => {
      if (errorStatus(error) !== 401) toast(apiErrorMessage(errorCode(error)), 'destructive');
    },
  });
}

interface SectionProps {
  readonly workspaceId: string;
  readonly post: Post;
  readonly channels: ReadonlyMap<string, Channel>;
  readonly format: (iso: string) => string;
  readonly editable: boolean;
}

export function EvergreenSection({ workspaceId, post, channels, format, editable }: SectionProps) {
  const client = useApiClient();
  const scope = { workspaceId, postId: post.id };
  const state = useQuery({ ...evergreenQuery(client, scope), enabled: post.evergreen !== null });
  const toggle = useToggle(scope);
  const switchId = useId();
  if (post.evergreen === null && !editable) return null;
  const data = post.evergreen === null ? undefined : state.data;
  const reason = data?.state === 'removed' ? data.stateReason : null;
  return (
    <section className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
      <div className="flex items-center gap-3">
        <input
          id={switchId}
          type="checkbox"
          role="switch"
          aria-checked={post.evergreen === 'active'}
          checked={post.evergreen === 'active'}
          disabled={!editable || toggle.isPending}
          onChange={(event) => toggle.mutate(event.currentTarget.checked)}
          className="size-4 accent-primary"
        />
        <label htmlFor={switchId} className="font-medium">
          {m.evergreen_label()}
        </label>
      </div>
      {reason === null || reason === 'unmarked' ? null : (
        <p className="text-muted-foreground">{m.evergreen_reason({ reason })}</p>
      )}
      {data === undefined || data.recent.length === 0 ? null : (
        <>
          <h2 className="font-medium">{m.evergreen_copies()}</h2>
          <ul className="flex flex-col gap-1">
            {data.recent.map((copy) => {
              const text = m.evergreen_copy({
                channel: channels.get(copy.channelId)?.displayName ?? copy.channelId,
                when: format(copy.slotAt),
              });
              return (
                <li key={`${copy.channelId}${copy.slotAt}`}>
                  {copy.copyPostId === null ? (
                    text
                  ) : (
                    <Link
                      to="/posts/$postId"
                      params={{ postId: copy.copyPostId }}
                      className="underline underline-offset-4"
                    >
                      {text}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
