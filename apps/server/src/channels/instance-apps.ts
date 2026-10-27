import { ProviderFailure } from '@kronaut/core';
import type { Keyring } from '@kronaut/credentials';
import type { Database, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { sealAppSecret } from '../credential-store.ts';
import { HttpError } from '../http/errors.ts';
import type { RequestContext } from '../http/types.ts';
import type { ProviderEntry } from '../providers.ts';
import { type ChannelRouteDeps, providerContext, redirectUri, SYSTEM } from './deps.ts';

export const REGISTRATIONS_PER_HOUR = 10;
const REGISTRATION_WINDOW_SECONDS = 60 * 60;
const CLIENT_NAME = 'Kronaut';

export function registrationBucketKey(workspaceId: string): string {
  return `endpoint:provider_app_register:${workspaceId}`;
}

interface InstanceApp {
  readonly provider: string;
  readonly instanceHost: string;
  readonly redirectUri: string;
}

export async function selectInstanceAppId(trx: TenantDb, app: InstanceApp): Promise<string | null> {
  const row = await trx
    .selectFrom('provider_apps')
    .select('id')
    .where('provider', '=', app.provider)
    .where('instance_host', '=', app.instanceHost)
    .where('redirect_uri', '=', app.redirectUri)
    .where('status', '=', 'active')
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(1)
    .executeTakeFirst();
  return row?.id ?? null;
}

export async function takeRegistration(trx: TenantDb, workspaceId: string): Promise<boolean> {
  const result = await sql<{ key: string }>`
    insert into rate_buckets as b (key, kind, capacity, tokens, window_start, window_secs)
    values (${registrationBucketKey(workspaceId)}, 'window_quota', ${REGISTRATIONS_PER_HOUR},
            ${REGISTRATIONS_PER_HOUR - 1}, now(), ${REGISTRATION_WINDOW_SECONDS})
    on conflict (key) do update set
      tokens = case when b.window_start + make_interval(secs => b.window_secs) <= now()
                    then excluded.capacity - 1 else b.tokens - 1 end,
      window_start = case when b.window_start + make_interval(secs => b.window_secs) <= now()
                          then now() else b.window_start end,
      capacity = excluded.capacity,
      window_secs = excluded.window_secs,
      updated_at = now()
    where b.window_start + make_interval(secs => b.window_secs) <= now() or b.tokens >= 1
    returning b.key
  `.execute(trx);
  return result.rows.length === 1;
}

interface NewInstanceApp extends InstanceApp {
  readonly clientId: string;
  readonly clientSecret: string;
}

async function insertInstanceApp(
  trx: TenantDb,
  keyring: Keyring,
  app: NewInstanceApp,
): Promise<string> {
  const { rows } = await sql<{ id: string }>`select uuidv7() as id`.execute(trx);
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('uuidv7() returned no row');
  await trx
    .insertInto('provider_apps')
    .values({
      id,
      provider: app.provider,
      instance_host: app.instanceHost,
      redirect_uri: app.redirectUri,
      client_id: app.clientId,
      ...sealAppSecret(keyring, id, app.provider, app.clientSecret),
    })
    .execute();
  return id;
}

export async function instanceAppId(
  deps: ChannelRouteDeps,
  ctx: RequestContext,
  target: { readonly entry: ProviderEntry; readonly workspaceId: string; readonly host: string },
): Promise<string> {
  const provider = target.entry.manifest.id;
  const wanted = { provider, instanceHost: target.host, redirectUri: redirectUri(deps, provider) };
  const existing = await ctx.tenant((trx) => selectInstanceAppId(trx, wanted));
  if (existing !== null) return existing;
  const { registerApp } = target.entry.runtime;
  if (registerApp === undefined)
    throw new ProviderFailure({ kind: 'app_config', code: 'register_app_missing' });
  if (!(await ctx.tenant((trx) => takeRegistration(trx, target.workspaceId)))) {
    throw new HttpError('rate_limited', 'Too many servers were set up recently. Try again later.');
  }
  const registered = await registerApp.call(
    target.entry.runtime,
    providerContext(deps, target.entry, ctx),
    { instanceHost: target.host, redirectUri: wanted.redirectUri, clientName: CLIENT_NAME },
  );
  const id = await ctx.tenant((trx) =>
    insertInstanceApp(trx, deps.keyring, {
      ...wanted,
      clientId: registered.clientId,
      clientSecret: registered.clientSecret,
    }),
  );
  ctx.logger.info({ providerAppId: id, provider }, 'instance provider app registered');
  return id;
}

export async function markAppMisconfigured(db: Database, appId: string): Promise<void> {
  await db.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('provider_apps')
      .set({ status: 'misconfigured' })
      .where('id', '=', appId)
      .where('instance_host', '<>', '')
      .where('status', '=', 'active')
      .execute(),
  );
}
