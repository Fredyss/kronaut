import { setTimeout as sleep } from 'node:timers/promises';
import type {
  Account,
  IssuedCredentials,
  ProviderApp,
  ProviderError,
  RefreshKind,
} from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { loadCredentialById, loadProviderApp, persistRefreshed } from '../credential-store.ts';
import type { ProviderEntry } from '../providers.ts';
import { resolveExpiring } from './incidents.ts';
import { SYSTEM } from './lock.ts';
import type { RefreshDeps, RefreshOutcome, RefreshTarget } from './refresh.ts';

const LEASE_SECONDS = 60;
const WAIT_POLL_MS = 1000;
const WAIT_POLLS = 60;
const PERSIST_TRIES = 5;
const TRANSIENT: RefreshOutcome = { kind: 'transient' };

export type Acquired =
  | { readonly kind: 'done'; readonly outcome: RefreshOutcome }
  | { readonly kind: 'held' }
  | {
      readonly kind: 'leased';
      readonly takeover: boolean;
      readonly entry: ProviderEntry;
      readonly provider: string;
      readonly app: ProviderApp;
      readonly account: Account;
      readonly credentials: unknown;
    };

export interface LeaseHold {
  readonly target: RefreshTarget;
  readonly owner: string;
  readonly provider: string;
  readonly logger: Logger;
}

export function canRefresh(entry: ProviderEntry | undefined): entry is ProviderEntry {
  return (
    entry !== undefined &&
    entry.manifest.auth.refresh !== 'none' &&
    entry.runtime.refresh !== undefined
  );
}

export function consumesToken(kind: RefreshKind): boolean {
  return kind === 'rotating' || kind === 'single_use';
}

async function takeLease(trx: TenantDb, target: RefreshTarget, owner: string): Promise<boolean> {
  const taken = await trx
    .updateTable('account_credentials')
    .set({
      refresh_lease_until: sql<Date>`now() + make_interval(secs => ${LEASE_SECONDS})`,
      refresh_lease_owner: owner,
    })
    .where('workspace_id', '=', target.workspaceId)
    .where('id', '=', target.credentialId)
    .where('version', '=', target.expectedVersion)
    .where((eb) =>
      eb.or([
        eb('refresh_lease_until', 'is', null),
        eb('refresh_lease_until', '<=', sql<Date>`now()`),
      ]),
    )
    .executeTakeFirst();
  return taken.numUpdatedRows === 1n;
}

async function acquireIn(
  deps: RefreshDeps,
  trx: TenantDb,
  target: RefreshTarget,
  owner: string,
): Promise<Acquired> {
  const { workspaceId, credentialId, expectedVersion } = target;
  const row = await loadCredentialById(
    trx,
    deps.keyring,
    { workspaceId, credentialId },
    { forUpdate: true },
  );
  if (row === null) return { kind: 'done', outcome: TRANSIENT };
  if (row.version > expectedVersion) {
    return { kind: 'done', outcome: { kind: 'refreshed', version: row.version } };
  }
  if (row.providerAppStatus !== 'active') return { kind: 'done', outcome: { kind: 'skipped' } };
  const entry = deps.providers.get(row.provider);
  if (!canRefresh(entry)) throw new Error(`provider ${row.provider} cannot refresh`);
  const credentials = entry.runtime.parseCredentials(row.value);
  const app = await loadProviderApp(
    trx,
    deps.keyring,
    { id: row.providerAppId },
    { publicBaseUrl: deps.publicBaseUrl, keys: { use: 'bound', keyId: row.clientKeyId } },
  );
  if (app === null) throw new Error('social account has no provider app');
  if (app.signingKeyMissing) {
    return { kind: 'done', outcome: { kind: 'app', code: 'signing_key_missing' } };
  }
  if (!(await takeLease(trx, target, owner))) return { kind: 'held' };
  return {
    kind: 'leased',
    takeover: row.refreshLeaseOwner !== null,
    entry,
    provider: row.provider,
    app: app.app,
    account: {
      providerAccountId: row.providerAccountId,
      ...(row.handle === null ? {} : { handle: row.handle }),
    },
    credentials,
  };
}

export async function acquire(
  deps: RefreshDeps,
  target: RefreshTarget,
  owner: string,
): Promise<Acquired> {
  return await deps.db.withTenant(target.workspaceId, SYSTEM, (trx) =>
    acquireIn(deps, trx, target, owner),
  );
}

export async function waitForVersion(
  deps: RefreshDeps,
  target: RefreshTarget,
): Promise<RefreshOutcome> {
  const { workspaceId, credentialId, expectedVersion } = target;
  for (let poll = 0; poll < WAIT_POLLS; poll++) {
    await sleep(WAIT_POLL_MS);
    const row = await deps.db.withTenant(workspaceId, SYSTEM, (trx) =>
      trx
        .selectFrom('account_credentials')
        .select('version')
        .where('workspace_id', '=', workspaceId)
        .where('id', '=', credentialId)
        .executeTakeFirst(),
    );
    if (row === undefined) return TRANSIENT;
    if (row.version > expectedVersion) return { kind: 'refreshed', version: row.version };
  }
  return TRANSIENT;
}

export async function release(
  deps: RefreshDeps,
  target: RefreshTarget,
  owner: string,
  logger: Logger,
): Promise<void> {
  try {
    await deps.db.withTenant(target.workspaceId, SYSTEM, (trx) =>
      trx
        .updateTable('account_credentials')
        .set({ refresh_lease_until: null, refresh_lease_owner: null })
        .where('workspace_id', '=', target.workspaceId)
        .where('id', '=', target.credentialId)
        .where('refresh_lease_owner', '=', owner)
        .execute(),
    );
  } catch (err) {
    logger.warn({ err }, 'releasing the refresh lease failed; it expires on its own');
  }
}

export async function persist(
  deps: RefreshDeps,
  hold: LeaseHold,
  issued: IssuedCredentials<unknown>,
): Promise<RefreshOutcome> {
  const { target, owner, provider, logger } = hold;
  for (let tries = 1; tries <= PERSIST_TRIES; tries++) {
    let version: number | null;
    try {
      version = await deps.db.withTenant(target.workspaceId, SYSTEM, async (trx) => {
        const next = await persistRefreshed(trx, deps.keyring, {
          workspaceId: target.workspaceId,
          credentialId: target.credentialId,
          provider,
          version: target.expectedVersion,
          leaseOwner: owner,
          value: issued.credentials,
          grantedScopes: issued.grantedScopes,
          accessExpiresAt: issued.accessExpiresAt,
          refreshExpiresAt: issued.refreshExpiresAt,
        });
        if (next !== null) await resolveExpiring(trx, target.workspaceId, target.credentialId);
        return next;
      });
    } catch (err) {
      logger.warn({ err, tries }, 'persisting a refreshed credential failed');
      continue;
    }
    if (version !== null) return { kind: 'refreshed', version };
    logger.error('a refreshed credential lost its lease fence; the new token is discarded');
    return TRANSIENT;
  }
  logger.error('a refreshed credential could not be persisted; the new token is discarded');
  return TRANSIENT;
}

export function classify(
  error: ProviderError,
  kind: RefreshKind,
  takeover: boolean,
  fromVersion: number,
): RefreshOutcome {
  switch (error.kind) {
    case 'auth_revoked':
    case 'auth_expired':
      return { kind: 'rejected', lost: takeover && consumesToken(kind), fromVersion };
    case 'app_config':
      return { kind: 'app', code: error.code };
    case 'transient':
    case 'rate_limited':
    case 'ambiguous':
    case 'permanent':
    case 'duplicate':
      return TRANSIENT;
  }
}
