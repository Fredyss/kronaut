import { type Client, type SystemStatusResponse, systemStatus } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';
import { isManager } from '../../base/api/me.ts';

export type SystemStatus = SystemStatusResponse;

interface SystemReader {
  readonly instanceAdmin: boolean;
  readonly workspaces: readonly { readonly role: string }[];
}

export function canReadSystem(me: SystemReader | undefined): boolean {
  const role = me?.workspaces[0]?.role;
  return me?.instanceAdmin === true && role !== undefined && isManager(role);
}

export function systemStatusQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: ['system-status', workspaceId] as const,
    queryFn: async () => (await systemStatus({ client, path: { workspaceId } })).data,
    staleTime: 30_000,
  });
}
