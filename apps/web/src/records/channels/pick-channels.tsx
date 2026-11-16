import {
  channelsSelectionCancel,
  channelsSelectionConfirm,
  channelsSelectionRead,
} from '@kronaut/sdk';
import { Button, Modal, toast } from '@kronaut/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useRef, useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { detailCodes, errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, type Keyed, keyFor } from '../../base/api/idempotency.ts';
import { apiErrorMessage, m } from '../../base/locale/i18n.ts';
import { channelsKey } from './queries.ts';

const MAX_PICK = 100;

export interface PickChannelsProps {
  readonly workspaceId: string;
  readonly selectionId: string;
  onClose(): void;
}

function pickProblem(error: unknown): string {
  if (errorStatus(error) === 404) return m.channels_pick_expired();
  if (detailCodes(error).includes('too_many_accounts')) {
    return m.channels_error_too_many_accounts({ max: MAX_PICK });
  }
  return apiErrorMessage(errorCode(error));
}

function usePickWrites({ workspaceId, selectionId, onClose }: PickChannelsProps) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const keyed = useRef<Keyed | null>(null);
  const path = { workspaceId, selectionId };
  const confirm = useMutation({
    mutationFn: async (accounts: readonly string[]) => {
      keyed.current = keyFor(keyed.current, `${selectionId}|${[...accounts].sort().join(',')}`);
      const body = { accounts: [...accounts] };
      return (
        await channelsSelectionConfirm({ client, path, body, headers: idempotency(keyed.current) })
      ).data;
    },
    onSuccess: async ({ connected }) => {
      toast(m.channels_pick_connected({ count: connected.length }));
      onClose();
      await queryClient.invalidateQueries({ queryKey: channelsKey(workspaceId) });
    },
    onError: (error) => {
      if (errorStatus(error) !== null) keyed.current = null;
    },
  });
  const cancel = useMutation({
    mutationFn: async () => {
      const headers = idempotency(keyFor(null, `${selectionId}|cancel`));
      await channelsSelectionCancel({ client, path, headers });
    },
    onSettled: onClose,
  });
  return { confirm, cancel };
}

export function PickChannels(props: PickChannelsProps) {
  const { workspaceId, selectionId } = props;
  const client = useApiClient();
  const titleId = useId();
  const bodyId = useId();
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const selection = useQuery({
    queryKey: ['channel-selection', workspaceId, selectionId],
    queryFn: async () =>
      (await channelsSelectionRead({ client, path: { workspaceId, selectionId } })).data,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const { confirm, cancel } = usePickWrites(props);
  const items = selection.data?.items ?? [];
  const failure = selection.error ?? confirm.error;
  const gone = failure !== null && errorStatus(failure) === 404;
  const toggle = (id: string, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(id);
    else next.delete(id);
    setChosen(next);
  };
  const close = () => (gone ? props.onClose() : cancel.mutate());
  return (
    <Modal labelledBy={titleId} describedBy={bodyId} onCancel={close}>
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="font-medium text-lg">
          {m.channels_pick_title()}
        </h2>
        <p id={bodyId} className="text-muted-foreground text-sm">
          {m.channels_pick_body()}
        </p>
        {gone ? null : (
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <label className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-secondary">
                  <input
                    type="checkbox"
                    checked={chosen.has(item.id)}
                    onChange={(event) => toggle(item.id, event.currentTarget.checked)}
                    className="size-4 accent-primary"
                  />
                  <span className="font-medium">{item.displayName}</span>
                  {item.handle === null ? null : (
                    <span className="text-muted-foreground">{item.handle}</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}
        {failure !== null && errorStatus(failure) !== 401 ? (
          <p role="alert" className="text-destructive text-sm">
            {pickProblem(failure)}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" disabled={cancel.isPending} onClick={close}>
            {gone ? m.dialog_close() : m.inbox_cancel()}
          </Button>
          {gone ? null : (
            <Button
              type="button"
              disabled={chosen.size === 0 || confirm.isPending}
              onClick={() => confirm.mutate([...chosen])}
            >
              {m.channels_pick_confirm({ count: chosen.size })}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
