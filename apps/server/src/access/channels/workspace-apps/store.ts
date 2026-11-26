import type { ProviderManifest } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { selectAppId } from '../connect.ts';

export interface WorkspaceAppRow {
  readonly id: string;
  readonly provider: string;
  readonly client_id: string;
  readonly status: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

const COLUMNS = ['id', 'provider', 'client_id', 'status', 'created_at', 'updated_at'] as const;

// A live workspace app decides who pays: a misconfigured one fails the connect rather than binding the channel to
// the instance app.
export async function connectAppId(
  trx: TenantDb,
  manifest: ProviderManifest,
  workspaceId: string,
): Promise<string | null> {
  if (manifest.workspaceApps === true) {
    const own = await trx
      .selectFrom('provider_apps')
      .select(['id', 'status'])
      .where('workspace_id', '=', workspaceId)
      .where('provider', '=', manifest.id)
      .where('status', '<>', 'disabled')
      .executeTakeFirst();
    if (own !== undefined) return own.status === 'active' ? own.id : null;
  }
  return await selectAppId(trx, manifest.id);
}

export function listWorkspaceApps(trx: TenantDb, workspaceId: string): Promise<WorkspaceAppRow[]> {
  return trx
    .selectFrom('provider_apps')
    .select(COLUMNS)
    .where('workspace_id', '=', workspaceId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .execute();
}

export async function liveWorkspaceApp(
  trx: TenantDb,
  workspaceId: string,
  provider: string,
): Promise<WorkspaceAppRow | null> {
  const row = await trx
    .selectFrom('provider_apps')
    .select(COLUMNS)
    .where('workspace_id', '=', workspaceId)
    .where('provider', '=', provider)
    .where('status', '<>', 'disabled')
    .forUpdate()
    .executeTakeFirst();
  return row ?? null;
}

export async function workspaceAppById(
  trx: TenantDb,
  workspaceId: string,
  id: string,
): Promise<WorkspaceAppRow> {
  return await trx
    .selectFrom('provider_apps')
    .select(COLUMNS)
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', id)
    .executeTakeFirstOrThrow();
}
