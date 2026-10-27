import { approvalsDecide, authReauthenticate } from '@kronaut/sdk';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ME_KEY } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { idempotency, type Keyed, keyFor } from '../idempotency.ts';
import { denyCode, refreshApproval } from './queries.ts';

export interface PostScope {
  readonly workspaceId: string;
  readonly postId: string;
}

type Headers = ReturnType<typeof idempotency>;

export interface Job {
  readonly fingerprint: string;
  call(headers: Headers): Promise<unknown>;
}

export function useApprovalCall({ workspaceId, postId }: PostScope) {
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  return useMutation({
    mutationFn: (job: Job) => {
      keyed.current = keyFor(keyed.current, job.fingerprint);
      return job.call(idempotency(keyed.current));
    },
    onSuccess: () => {
      keyed.current = null;
    },
    onSettled: () => refreshApproval(queryClient, workspaceId, postId),
  });
}

export type Decision = 'approve' | 'reject' | 'request_changes';

function useReauthenticate() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) =>
      (await authReauthenticate({ client, body: { password } })).data,
    meta: { authAttempt: true },
    onError: () => queryClient.invalidateQueries({ queryKey: ME_KEY }),
  });
}

export function useDecide(scope: PostScope, requestId: string) {
  const client = useApiClient();
  const action = useApprovalCall(scope);
  const reauth = useReauthenticate();
  const [waiting, setWaiting] = useState<Decision | null>(null);
  const job = (decision: Decision): Job => ({
    fingerprint: JSON.stringify({ requestId, decision }),
    call: (headers) =>
      approvalsDecide({
        client,
        path: { workspaceId: scope.workspaceId, requestId },
        body: { decision },
        headers,
      }),
  });
  const decide = (decision: Decision) => {
    action.mutate(job(decision), {
      onError: (error) => {
        if (denyCode(error) === 'reauth_required') setWaiting(decision);
      },
    });
  };
  const confirm = (password: string) => {
    if (waiting === null) return;
    reauth.mutate(password, {
      onSuccess: () => {
        setWaiting(null);
        reauth.reset();
        action.mutate(job(waiting));
      },
    });
  };
  const close = () => {
    setWaiting(null);
    reauth.reset();
  };
  const dialog =
    waiting === null
      ? null
      : {
          pending: reauth.isPending,
          error: reauth.error === null ? null : m.approval_reauth_failed(),
          confirm,
          close,
        };
  return { decide, action, dialog };
}
