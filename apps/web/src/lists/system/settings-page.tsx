import { SettingsPage } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { meQuery } from '../../base/api/me.ts';
import { m } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { ApiVersionsCard } from './api-versions-card.tsx';
import { CronCard } from './cron-card.tsx';
import { IncidentsCard } from './incidents-card.tsx';
import { SloCard } from './slo-card.tsx';
import { systemStatusQuery } from './status.ts';

function SystemStatusCards({ workspaceId }: { readonly workspaceId: string }) {
  const client = useApiClient();
  const status = useQuery(systemStatusQuery(client, workspaceId));
  if (status.data === undefined) {
    return status.isError ? (
      <p role="alert" className="text-destructive text-sm">
        {m.error_generic()}
      </p>
    ) : (
      <p className="text-muted-foreground text-sm">{m.loading()}</p>
    );
  }
  const { slo, cron, incidents, apiVersions } = status.data;
  return (
    <>
      <SloCard slo={slo} />
      <CronCard cron={cron} />
      <IncidentsCard incidents={incidents} />
      <ApiVersionsCard versions={apiVersions} />
    </>
  );
}

export function SystemSettingsPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <SettingsPage title={settingsText.settings_system_title()}>
      {workspace === undefined ? null : <SystemStatusCards workspaceId={workspace.id} />}
    </SettingsPage>
  );
}
