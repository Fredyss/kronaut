import { useQuery } from '@tanstack/react-query';
import { meQuery } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { SettingsPage } from '../settings/card.tsx';
import { ApiVersionsCard } from '../system/api-versions-card.tsx';
import { CronCard } from '../system/cron-card.tsx';
import { IncidentsCard } from '../system/incidents-card.tsx';
import { SloCard } from '../system/slo-card.tsx';
import { systemStatusQuery } from '../system/status.ts';

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
    <SettingsPage title={m.settings_system_title()}>
      {workspace === undefined ? null : <SystemStatusCards workspaceId={workspace.id} />}
    </SettingsPage>
  );
}
