import { SettingsCard, SettingsPage } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { meQuery } from '../../base/api/me.ts';
import { m } from '../../base/locale/i18n.ts';
import { providerUi } from '../../base/providers/ui.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { LiveApp } from './live-app.tsx';
import { liveApp, workspaceAppsQuery } from './queries.ts';
import { RegisterForm } from './register-form.tsx';

const MANAGERS: ReadonlySet<string> = new Set(['owner', 'admin']);

function ProviderApps({ workspaceId }: { readonly workspaceId: string }) {
  const client = useApiClient();
  const apps = useQuery(workspaceAppsQuery(client, workspaceId));
  if (apps.data === undefined) {
    return apps.isError ? (
      <p role="alert" className="text-destructive text-sm">
        {m.error_generic()}
      </p>
    ) : (
      <p className="text-muted-foreground text-sm">{m.loading()}</p>
    );
  }
  if (apps.data.supported.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{settingsText.settings_workspace_apps_none()}</p>
    );
  }
  const data = apps.data;
  return data.supported.map((provider) => {
    const target = { workspaceId, provider, name: providerUi(provider).name() };
    const live = liveApp(data, provider);
    return live === undefined ? (
      <SettingsCard key={provider} title={target.name}>
        <RegisterForm {...target} />
      </SettingsCard>
    ) : (
      <LiveApp key={`${provider}:${live.clientId}`} target={target} app={live} />
    );
  });
}

export function WorkspaceAppSettingsPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <SettingsPage
      title={settingsText.settings_workspace_apps_title()}
      intro={settingsText.settings_workspace_apps_intro()}
    >
      {workspace === undefined ? null : (
        <div className="flex flex-col gap-6">
          {MANAGERS.has(workspace.role) ? (
            <ProviderApps workspaceId={workspace.id} />
          ) : (
            <p className="text-muted-foreground text-sm">{settingsText.settings_read_only()}</p>
          )}
        </div>
      )}
    </SettingsPage>
  );
}
