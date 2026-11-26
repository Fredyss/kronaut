import { Button, ConfirmDelete, SettingsCard, SettingsRow, TextField } from '@kronaut/ui';
import { type FormEvent, useState } from 'react';
import { m as settingsText } from '../../i18n/settings.ts';
import { workspaceAppErrors } from './errors.ts';
import type { WorkspaceApp } from './queries.ts';
import { SECRET_MAX } from './register-form.tsx';
import { useDisableApp, useReplaceSecret } from './writes.ts';

type Mode = 'view' | 'replace' | 'disable';

interface AppTarget {
  readonly workspaceId: string;
  readonly provider: string;
  readonly name: string;
}

function SecretForm({ target, onClose }: { readonly target: AppTarget; onClose(): void }) {
  const [secret, setSecret] = useState('');
  const replace = useReplaceSecret(target.workspaceId, target.provider, onClose);
  const error = replace.error === null ? undefined : workspaceAppErrors(replace.error).form;
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (secret.trim() !== '' && !replace.isPending) replace.mutate(secret);
  };
  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <TextField
        label={settingsText.settings_workspace_apps_new_secret()}
        type="password"
        autoComplete="off"
        value={secret}
        maxLength={SECRET_MAX}
        disabled={replace.isPending}
        error={error}
        onValueChange={setSecret}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" disabled={replace.isPending} onClick={onClose}>
          {settingsText.settings_workspace_apps_cancel()}
        </Button>
        <Button type="submit" disabled={secret.trim() === '' || replace.isPending}>
          {settingsText.settings_workspace_apps_save_secret()}
        </Button>
      </div>
    </form>
  );
}

function Actions({
  target,
  mode,
  onMode,
}: {
  readonly target: AppTarget;
  readonly mode: Mode;
  onMode(mode: Mode): void;
}) {
  const view = () => onMode('view');
  const disable = useDisableApp(target.workspaceId, target.provider);
  if (mode === 'replace') return <SecretForm target={target} onClose={view} />;
  if (mode === 'disable') {
    return (
      <ConfirmDelete
        title={settingsText.settings_workspace_apps_disable_title()}
        body={settingsText.settings_workspace_apps_disable_body({ provider: target.name })}
        keepLabel={settingsText.settings_workspace_apps_keep()}
        confirmLabel={settingsText.settings_workspace_apps_disable()}
        pending={disable.isPending}
        onCancel={view}
        onConfirm={() => disable.mutate()}
      />
    );
  }
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => onMode('replace')}>
        {settingsText.settings_workspace_apps_replace()}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => onMode('disable')}>
        {settingsText.settings_workspace_apps_disable()}
      </Button>
    </div>
  );
}

export function LiveApp({
  target,
  app,
}: {
  readonly target: AppTarget;
  readonly app: WorkspaceApp;
}) {
  const [mode, setMode] = useState<Mode>('view');
  const misconfigured = app.status === 'misconfigured';
  return (
    <SettingsCard
      title={target.name}
      footer={<Actions target={target} mode={mode} onMode={setMode} />}
    >
      <SettingsRow label={settingsText.settings_workspace_apps_client_id()}>
        <span className="break-all font-mono">{app.clientId}</span>
      </SettingsRow>
      <SettingsRow label={settingsText.settings_workspace_apps_status()}>
        <span className={misconfigured ? 'font-medium text-destructive' : undefined}>
          {misconfigured
            ? settingsText.settings_workspace_apps_status_misconfigured()
            : settingsText.settings_workspace_apps_status_active()}
        </span>
      </SettingsRow>
      <p
        className={
          misconfigured
            ? 'border-destructive border-l-4 bg-destructive/10 px-6 py-4 text-sm'
            : 'px-6 py-4 text-muted-foreground text-sm'
        }
      >
        {misconfigured
          ? settingsText.settings_workspace_apps_misconfigured({ provider: target.name })
          : settingsText.settings_workspace_apps_active_note({ provider: target.name })}
      </p>
    </SettingsCard>
  );
}
