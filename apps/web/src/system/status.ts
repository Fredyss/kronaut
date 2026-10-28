import { type Client, type SystemStatusResponse, systemStatus } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';

export type SystemStatus = SystemStatusResponse;

const SYSTEM_READERS: ReadonlySet<string> = new Set(['owner', 'admin']);

interface SystemReader {
  readonly instanceAdmin: boolean;
  readonly workspaces: readonly { readonly role: string }[];
}

export function canReadSystem(me: SystemReader | undefined): boolean {
  const role = me?.workspaces[0]?.role;
  return me?.instanceAdmin === true && role !== undefined && SYSTEM_READERS.has(role);
}

export function systemStatusQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: ['system-status', workspaceId] as const,
    queryFn: async () => (await systemStatus({ client, path: { workspaceId } })).data,
    staleTime: 30_000,
  });
}
