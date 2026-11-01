import type { Keyring } from '@kronaut/credentials';
import type { Actor, Database } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { STATE_TTL_SECONDS } from '../channels/connect.ts';
import { sealAppSecret } from '../credentials/credential-store.ts';
import { createSigningKey } from '../credentials/signing-keys.ts';
import { CommandError } from './errors.ts';

const CLI: Actor = { kind: 'cli' };
const BLUESKY = 'bluesky';
const BLUESKY_METADATA_PATH = '/oauth/bluesky/oauth-client-metadata.json';
export type SecretAppProvider = 'facebook' | 'instagram' | 'linkedin' | 'threads';

export interface ProviderAppCommandDeps {
  readonly db: Database;
  readonly logger: Logger;
}

export interface KeyListing {
  readonly kid: string;
  readonly status: string;
  readonly createdAt: Date;
}

function foreignKeyViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  return (err as { code?: unknown }).code === '23503';
}

export async function registerBluesky(
  deps: ProviderAppCommandDeps,
  publicUrl: URL,
): Promise<string> {
  const clientId = new URL(BLUESKY_METADATA_PATH, publicUrl).toString();
  const id = await deps.db.withActor(CLI, async (trx) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${`provider_app_register:${BLUESKY}`}, 0))`.execute(
      trx,
    );
    const existing = await trx
      .selectFrom('provider_apps')
      .select('id')
      .where('provider', '=', BLUESKY)
      .where('instance_host', '=', '')
      .executeTakeFirst();
    if (existing !== undefined) {
      const id = existing.id;
      throw new CommandError((m) => m.provider_app_exists({ provider: BLUESKY, id }));
    }
    const row = await trx
      .insertInto('provider_apps')
      .values({ provider: BLUESKY, instance_host: '', client_id: clientId })
      .returning('id')
      .executeTakeFirstOrThrow();
    return row.id;
  });
  deps.logger.info({ providerAppId: id, provider: BLUESKY }, 'provider app registered');
  return id;
}

export async function registerSecretApp(
  deps: ProviderAppCommandDeps & { readonly keyring: Keyring },
  provider: SecretAppProvider,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const id = await deps.db.withActor(CLI, async (trx) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${`provider_app_register:${provider}`}, 0))`.execute(
      trx,
    );
    const existing = await trx
      .selectFrom('provider_apps')
      .select('id')
      .where('provider', '=', provider)
      .where('instance_host', '=', '')
      .where('status', '=', 'active')
      .executeTakeFirst();
    if (existing !== undefined) {
      const id = existing.id;
      throw new CommandError((m) => m.provider_app_exists({ provider, id }));
    }
    const row = await trx
      .insertInto('provider_apps')
      .values({ provider, instance_host: '', client_id: clientId })
      .returning('id')
      .executeTakeFirstOrThrow();
    await trx
      .updateTable('provider_apps')
      .set(sealAppSecret(deps.keyring, row.id, provider, clientSecret))
      .where('id', '=', row.id)
      .execute();
    return row.id;
  });
  deps.logger.info({ providerAppId: id, provider }, 'provider app registered');
  return id;
}

export async function createKey(
  deps: ProviderAppCommandDeps & { readonly keyring: Keyring },
  appId: string,
): Promise<string> {
  const kid = await deps.db.withActor(CLI, async (trx) => {
    const app = await trx
      .selectFrom('provider_apps')
      .select('provider')
      .where('id', '=', appId)
      .executeTakeFirst();
    if (app === undefined) throw new CommandError((m) => m.provider_app_not_found({}));
    const key = createSigningKey(deps.keyring, appId, app.provider);
    await trx
      .insertInto('provider_app_keys')
      .values({
        ...key,
        public_jwk: JSON.stringify(key.public_jwk),
        provider_app_id: appId,
        status: 'next',
      })
      .execute();
    return key.kid;
  });
  deps.logger.info({ providerAppId: appId, kid }, 'signing key created as next');
  return kid;
}

export async function activateKey(
  deps: ProviderAppCommandDeps,
  appId: string,
  kid: string,
): Promise<void> {
  await deps.db.withActor(CLI, async (trx) => {
    const key = await trx
      .selectFrom('provider_app_keys')
      .select(['id', 'status'])
      .where('provider_app_id', '=', appId)
      .where('kid', '=', kid)
      .forUpdate()
      .executeTakeFirst();
    if (key === undefined) throw new CommandError((m) => m.key_not_found({}));
    const status = key.status;
    if (status !== 'next') {
      throw new CommandError((m) => m.key_not_next({ status }));
    }
    await trx
      .updateTable('provider_app_keys')
      .set({ status: 'retiring', updated_at: sql<Date>`now()` })
      .where('provider_app_id', '=', appId)
      .where('status', '=', 'active')
      .execute();
    await trx
      .updateTable('provider_app_keys')
      .set({ status: 'active', updated_at: sql<Date>`now()` })
      .where('id', '=', key.id)
      .execute();
  });
  deps.logger.info({ providerAppId: appId, kid }, 'signing key activated');
}

export async function deleteKey(
  deps: ProviderAppCommandDeps,
  appId: string,
  kid: string,
): Promise<void> {
  try {
    await deps.db.withActor(CLI, async (trx) => {
      const key = await trx
        .selectFrom('provider_app_keys')
        .select([
          'id',
          'status',
          sql<boolean>`updated_at > now() - make_interval(secs => ${STATE_TTL_SECONDS})`.as(
            'recent',
          ),
        ])
        .where('provider_app_id', '=', appId)
        .where('kid', '=', kid)
        .forUpdate()
        .executeTakeFirst();
      if (key === undefined) throw new CommandError((m) => m.key_not_found({}));
      if (key.status === 'active') throw new CommandError((m) => m.key_active({}));
      if (key.status === 'retiring' && key.recent) {
        const count = STATE_TTL_SECONDS / 60;
        throw new CommandError((m) => m.key_recently_retired({ kid, count }));
      }
      await trx.deleteFrom('provider_app_keys').where('id', '=', key.id).execute();
    });
  } catch (err) {
    if (foreignKeyViolation(err)) {
      throw new CommandError((m) => m.key_in_use({ kid }));
    }
    throw err;
  }
  deps.logger.info({ providerAppId: appId, kid }, 'signing key deleted');
}

export async function listKeys(deps: ProviderAppCommandDeps, appId: string): Promise<KeyListing[]> {
  const rows = await deps.db.withActor(CLI, (trx) =>
    trx
      .selectFrom('provider_app_keys')
      .select(['kid', 'status', 'created_at'])
      .where('provider_app_id', '=', appId)
      .orderBy('created_at')
      .orderBy('id')
      .execute(),
  );
  return rows.map((row) => ({ kid: row.kid, status: row.status, createdAt: row.created_at }));
}
