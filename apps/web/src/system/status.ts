import { type Client, type SystemStatusResponse, systemStatus } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';

export type SystemStatus = SystemStatusResponse;

const SYSTEM_READERS: ReadonlySet<string> = new Set(['owner', 'admin']);

export function canReadSystem(role: string | undefined): boolean {
  return role !== undefined && SYSTEM_READERS.has(role);
}

export function systemStatusQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: ['system-status', workspaceId] as const,
    queryFn: async () => (await systemStatus({ client, path: { workspaceId } })).data,
    staleTime: 30_000,
  });
}
