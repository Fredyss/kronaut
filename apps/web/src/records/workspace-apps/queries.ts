import { type Client, type ProviderAppsListResponse, providerAppsList } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';

export type WorkspaceApps = ProviderAppsListResponse;
export type WorkspaceApp = WorkspaceApps['items'][number];

export function workspaceAppsKey(workspaceId: string) {
  return ['provider-apps', workspaceId] as const;
}

export function workspaceAppsQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: workspaceAppsKey(workspaceId),
    queryFn: async () => (await providerAppsList({ client, path: { workspaceId } })).data,
  });
}

export function liveApp(apps: WorkspaceApps, provider: string): WorkspaceApp | undefined {
  return apps.items.find((app) => app.provider === provider && app.status !== 'disabled');
}
