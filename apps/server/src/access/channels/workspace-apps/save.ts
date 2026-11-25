import { randomUUID } from 'node:crypto';
import type { Keyring } from '@kronaut/credentials';
import type { TenantDb } from '@kronaut/db';
import { HttpError } from '../../../base/http/errors.ts';
import type { RequestContext } from '../../../base/http/request.ts';
import { sealWorkspaceAppSecret } from '../../../infrastructure/credentials/credential-store.ts';
import { liveWorkspaceApp, type WorkspaceAppRow, workspaceAppById } from './store.ts';

const UNIQUE_VIOLATION = '23505';
const ACTIVE_INDEX = 'ux_provider_apps_workspace_active';

type Ctx = Pick<RequestContext, 'tenant' | 'requestId'>;

export interface WorkspaceAppActor {
  readonly ctx: Ctx;
  readonly keyring: Keyring;
  readonly workspaceId: string;
  readonly userId: string;
}

export interface NewWorkspaceApp {
  readonly provider: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

function appExists(): HttpError {
  return new HttpError('conflict', 'The workspace already has an app for this provider.', {
    details: [{ path: 'body.provider', code: 'workspace_app_exists' }],
  });
}

function noLiveApp(): HttpError {
  return new HttpError('not_found', 'The workspace has no app for this provider.');
}

function uniqueViolation(err: unknown): string | null {
  if (typeof err !== 'object' || err === null) return null;
  const { code, constraint } = err as { code?: unknown; constraint?: unknown };
  if (code !== UNIQUE_VIOLATION) return null;
  return typeof constraint === 'string' ? constraint : '';
}

// The client secret is sealed and never part of an event; only the provider and client id are recorded.
async function audit(
  trx: TenantDb,
  actor: WorkspaceAppActor,
  row: { readonly action: string; readonly app: WorkspaceAppRow },
): Promise<void> {
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: actor.workspaceId,
      actor_kind: 'user',
      actor_id: actor.userId,
      surface: 'ui',
      action: row.action,
      resource_kind: 'provider_app',
      resource_id: row.app.id,
      outcome: 'ok',
      args_summary: JSON.stringify({ provider: row.app.provider, client_id: row.app.client_id }),
      correlation_id: randomUUID(),
      request_id: actor.ctx.requestId,
    })
    .execute();
}

// The client id is unique across the instance, so registering it again after a disable revives that row.
async function storeApp(
  trx: TenantDb,
  actor: WorkspaceAppActor,
  input: NewWorkspaceApp,
): Promise<string> {
  const { workspaceId, keyring } = actor;
  const disabled = await trx
    .selectFrom('provider_apps')
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('provider', '=', input.provider)
    .where('instance_host', '=', '')
    .where('client_id', '=', input.clientId)
    .where('status', '=', 'disabled')
    .forUpdate()
    .executeTakeFirst();
  const id = disabled?.id ?? randomUUID();
  const sealed = sealWorkspaceAppSecret(
    keyring,
    { id, provider: input.provider, workspaceId },
    input.clientSecret,
  );
  if (disabled !== undefined) {
    await trx
      .updateTable('provider_apps')
      .set({ ...sealed, status: 'active' })
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', id)
      .execute();
    return id;
  }
  await trx
    .insertInto('provider_apps')
    .values({
      id,
      provider: input.provider,
      client_id: input.clientId,
      workspace_id: workspaceId,
      ...sealed,
    })
    .execute();
  return id;
}

export async function registerWorkspaceApp(
  actor: WorkspaceAppActor,
  input: NewWorkspaceApp,
): Promise<WorkspaceAppRow> {
  const { workspaceId } = actor;
  try {
    return await actor.ctx.tenant(async (trx) => {
      if ((await liveWorkspaceApp(trx, workspaceId, input.provider)) !== null) throw appExists();
      const id = await storeApp(trx, actor, input);
      const app = await workspaceAppById(trx, workspaceId, id);
      await audit(trx, actor, { action: 'provider_app.registered', app });
      return app;
    });
  } catch (err) {
    const constraint = uniqueViolation(err);
    if (constraint === null) throw err;
    if (constraint === ACTIVE_INDEX) throw appExists();
    throw new HttpError('conflict', 'This client id is already registered on this server.', {
      details: [{ path: 'body.clientId', code: 'client_id_taken' }],
    });
  }
}

export async function replaceWorkspaceAppSecret(
  actor: WorkspaceAppActor,
  provider: string,
  clientSecret: string,
): Promise<WorkspaceAppRow> {
  const { workspaceId, keyring } = actor;
  return await actor.ctx.tenant(async (trx) => {
    const live = await liveWorkspaceApp(trx, workspaceId, provider);
    if (live === null) throw noLiveApp();
    await trx
      .updateTable('provider_apps')
      .set({
        ...sealWorkspaceAppSecret(keyring, { id: live.id, provider, workspaceId }, clientSecret),
        status: 'active',
      })
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', live.id)
      .execute();
    const app = await workspaceAppById(trx, workspaceId, live.id);
    await audit(trx, actor, { action: 'provider_app.secret_replaced', app });
    return app;
  });
}

export async function disableWorkspaceApp(
  actor: WorkspaceAppActor,
  provider: string,
): Promise<void> {
  const { workspaceId } = actor;
  await actor.ctx.tenant(async (trx) => {
    const live = await liveWorkspaceApp(trx, workspaceId, provider);
    if (live === null) throw noLiveApp();
    await trx
      .updateTable('provider_apps')
      .set({ status: 'disabled' })
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', live.id)
      .execute();
    await audit(trx, actor, { action: 'provider_app.disabled', app: live });
  });
}
