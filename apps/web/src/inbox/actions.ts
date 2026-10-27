import {
  type Client,
  destinationsCancel,
  destinationsMarkPublished,
  destinationsSendAgain,
} from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import {
  detailCodes,
  errorCode,
  errorStatus,
  isUnauthenticated,
  type NeedsActionItem,
  needsActionKey,
  type Post,
  postKey,
  postsKey,
} from '../api.ts';
import { issueMessage } from '../compose/issues.ts';
import { useApiClient } from '../context.ts';
import { apiErrorMessage, m } from '../i18n.ts';
import { idempotency, type Keyed, keyFor } from '../idempotency.ts';

export type ResolveKind = 'mark' | 'send' | 'cancel';

export type Outcome = 'done' | 'duplicate_risk' | 'failed';

export interface ResolveRequest {
  readonly kind: ResolveKind;
  readonly acknowledge: boolean;
}

const ACTIONS: Readonly<Record<NeedsActionItem['state'], readonly ResolveKind[]>> = {
  unconfirmed: ['mark', 'send'],
  awaiting_manual: ['mark', 'cancel'],
  failed: ['send', 'cancel'],
  blocked: ['send', 'cancel'],
};

export function actionsFor(state: NeedsActionItem['state']): readonly ResolveKind[] {
  return ACTIONS[state];
}

const DONE: Readonly<Record<ResolveKind, () => string>> = {
  mark: () => m.inbox_marked(),
  send: () => m.inbox_sent_again(),
  cancel: () => m.inbox_canceled(),
};

interface Body {
  readonly expectedVersion: number;
  readonly mode?: 'asap';
  readonly acknowledgeDuplicate?: boolean;
}

interface Call {
  readonly client: Client;
  readonly workspaceId: string;
  readonly item: NeedsActionItem;
  readonly kind: ResolveKind;
  readonly body: Body;
}

function bodyOf(item: NeedsActionItem, request: ResolveRequest): Body {
  const expectedVersion = item.version;
  if (request.kind !== 'send') return { expectedVersion };
  return request.acknowledge
    ? { expectedVersion, mode: 'asap', acknowledgeDuplicate: true }
    : { expectedVersion, mode: 'asap' };
}

async function call({ client, workspaceId, item, kind, body }: Call, keyed: Keyed): Promise<Post> {
  const path = { workspaceId, postId: item.postId, destinationId: item.destinationId };
  const headers = idempotency(keyed);
  if (kind === 'mark') {
    return (await destinationsMarkPublished({ client, path, body, headers })).data;
  }
  if (kind === 'cancel') return (await destinationsCancel({ client, path, body, headers })).data;
  return (await destinationsSendAgain({ client, path, body: { ...body, mode: 'asap' }, headers }))
    .data;
}

function isDuplicateRisk(error: unknown): boolean {
  return errorCode(error) === 'unprocessable' && detailCodes(error).includes('duplicate_risk');
}

function failureMessage(error: unknown): string {
  const code = detailCodes(error)[0];
  return code === undefined ? apiErrorMessage(errorCode(error)) : issueMessage(code);
}

function refresh(queryClient: QueryClient, workspaceId: string): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: needsActionKey(workspaceId) }),
    queryClient.invalidateQueries({ queryKey: postsKey(workspaceId) }),
  ]).then(() => undefined);
}

function failed(queryClient: QueryClient, workspaceId: string, error: unknown): Outcome {
  if (isDuplicateRisk(error)) return 'duplicate_risk';
  if (errorStatus(error) === 409) {
    toast(m.inbox_changed());
    void refresh(queryClient, workspaceId);
  } else if (!isUnauthenticated(error)) {
    toast(failureMessage(error), 'destructive');
  }
  return 'failed';
}

export function useResolve(workspaceId: string, item: NeedsActionItem) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  const mutation = useMutation({
    mutationFn: (request: ResolveRequest) => {
      const body = bodyOf(item, request);
      const fingerprint = JSON.stringify({ id: item.destinationId, kind: request.kind, body });
      keyed.current = keyFor(keyed.current, fingerprint);
      return call({ client, workspaceId, item, kind: request.kind, body }, keyed.current);
    },
    onSuccess: async (post, request) => {
      keyed.current = null;
      queryClient.setQueryData(postKey(workspaceId, post.id), post);
      toast(DONE[request.kind]());
      await refresh(queryClient, workspaceId);
    },
  });
  const run = async (request: ResolveRequest): Promise<Outcome> => {
    try {
      await mutation.mutateAsync(request);
      return 'done';
    } catch (error) {
      return failed(queryClient, workspaceId, error);
    }
  };
  return { run, pending: mutation.isPending };
}
