import { postsDelete } from '@kronaut/sdk';
import { Button, toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useRef } from 'react';
import { errorCode, errorStatus, postKey, postsKey } from '../api.ts';
import { useApiClient } from '../context.ts';
import { apiErrorMessage, m } from '../i18n.ts';
import { idempotency, type Keyed, keyFor } from '../idempotency.ts';
import { Modal } from './modal.tsx';

const LIVE: ReadonlySet<string> = new Set(['published', 'unconfirmed']);

export interface DeleteTarget {
  readonly id: string;
  readonly destinations: readonly { readonly state: string }[];
}

export interface DeleteDialogProps {
  readonly workspaceId: string;
  readonly post: DeleteTarget;
  onClose(): void;
  onDeleted(): void;
}

function deleteProblem(error: unknown): string {
  const code = errorCode(error);
  return code === 'destination_live' ? m.post_delete_live() : apiErrorMessage(code);
}

function useDelete(workspaceId: string, postId: string, onDeleted: () => void) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  return useMutation({
    mutationFn: async () => {
      keyed.current = keyFor(keyed.current, postId);
      const path = { workspaceId, postId };
      await postsDelete({ client, path, headers: idempotency(keyed.current) });
    },
    onError: (error) => {
      if (errorStatus(error) !== null) keyed.current = null;
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: postKey(workspaceId, postId) });
      toast(m.post_deleted());
      onDeleted();
      await queryClient.invalidateQueries({ queryKey: postsKey(workspaceId) });
    },
  });
}

export function DeleteDialog({ workspaceId, post, onClose, onDeleted }: DeleteDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const remove = useDelete(workspaceId, post.id, onDeleted);
  const failed = remove.error !== null && errorStatus(remove.error) !== 401;
  const live = post.destinations.filter((destination) => LIVE.has(destination.state)).length;
  return (
    <Modal labelledBy={titleId} describedBy={bodyId} onCancel={onClose}>
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="font-medium text-lg">
          {m.post_delete_title()}
        </h2>
        <div id={bodyId} className="flex flex-col gap-2 text-muted-foreground text-sm">
          <p>{m.post_delete_body()}</p>
          {live === 0 ? null : <p>{m.post_delete_published({ count: live })}</p>}
        </div>
        {failed ? (
          <p role="alert" className="text-destructive text-sm">
            {deleteProblem(remove.error)}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {m.post_delete_keep()}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
          >
            {m.post_delete_confirm()}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
