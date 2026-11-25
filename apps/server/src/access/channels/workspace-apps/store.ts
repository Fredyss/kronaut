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

async function selectWorkspaceAppId(
  trx: TenantDb,
  workspaceId: string,
  provider: string,
): Promise<string | null> {
  const row = await trx
    .selectFrom('provider_apps')
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('provider', '=', provider)
    .where('status', '=', 'active')
    .executeTakeFirst();
  return row?.id ?? null;
}

export async function connectAppId(
  trx: TenantDb,
  manifest: ProviderManifest,
  workspaceId: string,
): Promise<string | null> {
  if (manifest.workspaceApps === true) {
    const own = await selectWorkspaceAppId(trx, workspaceId, manifest.id);
    if (own !== null) return own;
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
