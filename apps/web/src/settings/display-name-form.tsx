import { authMeUpdate } from '@kronaut/sdk';
import { Button, Input, toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type Me, meQuery } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m as settingsText } from '../i18n/settings.ts';
import { m } from '../i18n.ts';
import type { ControlIds } from './card.tsx';

const DISPLAY_NAME_MAX_LENGTH = 80;

interface DisplayNameFormProps extends ControlIds {
  readonly stored: string | null;
}

export function DisplayNameForm({ stored, ...ids }: DisplayNameFormProps) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [value, setValue] = useState(stored ?? '');
  const save = useMutation({
    mutationFn: async (displayName: string | null) =>
      (await authMeUpdate({ client, body: { displayName } })).data.user,
    onSuccess: (user) => {
      queryClient.setQueryData(meQuery(client).queryKey, (old: Me | undefined) =>
        old === undefined ? old : { ...old, user },
      );
      setValue(user.displayName ?? '');
      toast(settingsText.settings_name_saved());
    },
    onError: () => toast(settingsText.settings_name_failed(), 'destructive'),
  });
  const next = value.trim();
  const changed = next !== (stored ?? '');
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (changed && !save.isPending) save.mutate(next === '' ? null : next);
      }}
    >
      <Input
        {...ids}
        value={value}
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        autoComplete="name"
        className="h-8 w-40 sm:w-56"
        onChange={(event) => setValue(event.currentTarget.value)}
      />
      <Button type="submit" size="sm" disabled={!changed || save.isPending}>
        {m.settings_save()}
      </Button>
    </form>
  );
}
