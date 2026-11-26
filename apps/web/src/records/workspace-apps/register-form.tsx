import { Button, TextField } from '@kronaut/ui';
import { type FormEvent, useState } from 'react';
import { m as settingsText } from '../../i18n/settings.ts';
import { workspaceAppErrors } from './errors.ts';
import { type AppDraft, useRegisterApp } from './writes.ts';

const CLIENT_ID_MAX = 256;
export const SECRET_MAX = 512;
const EMPTY: AppDraft = { clientId: '', clientSecret: '' };

function callbackUrl(provider: string): string {
  return `${window.location.origin}/v1/oauth/${provider}/callback`;
}

interface RegisterFormProps {
  readonly workspaceId: string;
  readonly provider: string;
  readonly name: string;
}

export function RegisterForm({ workspaceId, provider, name }: RegisterFormProps) {
  const [draft, setDraft] = useState(EMPTY);
  const register = useRegisterApp(workspaceId, provider);
  const errors = register.error === null ? {} : workspaceAppErrors(register.error);
  const filled = draft.clientId.trim() !== '' && draft.clientSecret.trim() !== '';
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (filled && !register.isPending) register.mutate(draft);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4 px-6 py-4">
      <div className="flex flex-col gap-2 text-muted-foreground text-sm">
        <p>{settingsText.settings_workspace_apps_instance({ provider: name })}</p>
        <p>{settingsText.settings_workspace_apps_own_hint({ provider: name })}</p>
      </div>
      <TextField
        label={settingsText.settings_workspace_apps_callback()}
        hint={settingsText.settings_workspace_apps_callback_hint({ provider: name })}
        value={callbackUrl(provider)}
        readOnly
        onFocus={(event) => event.currentTarget.select()}
        onValueChange={() => undefined}
      />
      <fieldset disabled={register.isPending} className="contents">
        <TextField
          label={settingsText.settings_workspace_apps_client_id()}
          value={draft.clientId}
          maxLength={CLIENT_ID_MAX}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          error={errors.clientId}
          onValueChange={(clientId) => setDraft((current) => ({ ...current, clientId }))}
        />
        <TextField
          label={settingsText.settings_workspace_apps_client_secret()}
          type="password"
          autoComplete="off"
          value={draft.clientSecret}
          maxLength={SECRET_MAX}
          error={errors.clientSecret}
          onValueChange={(clientSecret) => setDraft((current) => ({ ...current, clientSecret }))}
        />
      </fieldset>
      {errors.form === undefined ? null : (
        <p role="alert" className="text-destructive text-sm">
          {errors.form}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={!filled || register.isPending}>
          {settingsText.settings_workspace_apps_register()}
        </Button>
      </div>
    </form>
  );
}
