import { groupsCreate, groupsDelete, groupsUpdate } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { detailCodes, errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { useNamedCreate } from '../../base/api/named-create.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { groupsKey } from './queries.ts';

export function groupError(error: unknown): string {
  const code = errorCode(error);
  if (code === 'group_name_taken') return settingsText.settings_group_name_taken();
  if (detailCodes(error).includes('name_invalid')) {
    return settingsText.settings_group_name_invalid();
  }
  return apiErrorMessage(code);
}

export function useCreateGroup(workspaceId: string, onCreated: () => void) {
  const client = useApiClient();
  return useNamedCreate({
    queryKey: groupsKey(workspaceId),
    create: async (name, headers) =>
      (await groupsCreate({ client, path: { workspaceId }, body: { name }, headers })).data,
    created: ({ name }) => {
      toast(settingsText.settings_group_created({ name }));
      onCreated();
    },
  });
}

export interface GroupWriteEffects {
  readonly deleteTouches: readonly QueryKey[];
  onDeleted(): void;
}

export function useGroupWrites(workspaceId: string, groupId: string, effects: GroupWriteEffects) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const path = { workspaceId, groupId };
  const headers = () => idempotency(keyFor(null, groupId));
  const settled = () => queryClient.invalidateQueries({ queryKey: groupsKey(workspaceId) });
  const failed = (error: unknown) => {
    if (errorStatus(error) !== 401) toast(groupError(error), 'destructive');
  };
  const rename = useMutation({
    mutationFn: async (name: string) => {
      await groupsUpdate({ client, path, body: { name }, headers: headers() });
    },
    onSuccess: () => toast(settingsText.settings_group_saved()),
    onError: failed,
    onSettled: settled,
  });
  const remove = useMutation({
    mutationFn: async () => {
      await groupsDelete({ client, path, headers: headers() });
    },
    onSuccess: () => {
      toast(settingsText.settings_group_deleted());
      effects.onDeleted();
    },
    onError: failed,
    onSettled: () =>
      Promise.all([
        settled(),
        ...effects.deleteTouches.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ]),
  });
  return { rename, remove };
}
