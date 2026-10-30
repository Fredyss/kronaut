import {
  type Account,
  encodePublicId,
  isProviderFailure,
  type ProviderApp,
  toDate,
} from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import type { Temporal } from 'temporal-polyfill';
import { loadCredential, loadProviderApp } from '../credential-store.ts';
import type { ProviderEntry } from '../providers.ts';
import type { RefreshDeps } from '../publish/refresh.ts';

export type PullDeps = Pick<
  RefreshDeps,
  'db' | 'keyring' | 'providers' | 'logger' | 'publicBaseUrl' | 'now'
>;

export type Counts = Record<
  | 'channels'
  | 'pulled'
  | 'snapshots'
  | 'done'
  | 'retried'
  | 'stopped'
  | 'skipped'
  | 'unreadable'
  | 'followerChecks'
  | 'followers'
  | 'failed',
  number
>;

export interface Run {
  readonly deps: PullDeps;
  readonly observedAt: Date;
  readonly counts: Counts;
}

export interface Source {
  readonly app: ProviderApp;
  readonly account: Account;
  readonly credentials: unknown;
}

export interface ChannelRef {
  readonly workspaceId: string;
  readonly accountId: string;
}

export async function loadSource(
  trx: TenantDb,
  deps: PullDeps,
  channel: ChannelRef & { readonly entry: ProviderEntry },
): Promise<Source | null> {
  const { workspaceId, accountId, entry } = channel;
  const account = await trx
    .selectFrom('social_accounts')
    .select(['provider_app_id', 'provider_account_id', 'handle'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', accountId)
    .executeTakeFirst();
  if (account === undefined) return null;
  const credential = await loadCredential(trx, deps.keyring, {
    workspaceId,
    socialAccountId: accountId,
    kind: entry.manifest.auth.kind,
  });
  if (credential === null) return null;
  const app = await loadProviderApp(
    trx,
    deps.keyring,
    { id: account.provider_app_id },
    { publicBaseUrl: deps.publicBaseUrl },
  );
  if (app === null) return null;
  return {
    app: app.app,
    account: {
      providerAccountId: account.provider_account_id,
      ...(account.handle === null ? {} : { handle: account.handle }),
    },
    credentials: entry.runtime.parseCredentials(credential.value),
  };
}

// A credential the runtime cannot parse stays broken until the channel is reconnected; skip it, don't fail the run.
export async function sourceOf(
  trx: TenantDb,
  deps: PullDeps,
  channel: ChannelRef & { readonly entry: ProviderEntry },
): Promise<Source | 'unreadable' | null> {
  try {
    return await loadSource(trx, deps, channel);
  } catch (err) {
    if (!(err instanceof Error) || err.name !== 'ZodError') throw err;
    deps.logger.error(
      { task: 'analytics_pull', channel: encodePublicId('socialAccount', channel.accountId) },
      'stored credentials for a channel could not be read',
    );
    return 'unreadable';
  }
}

export function metricValue(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function utcDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export function utcDayOf(now: Temporal.Instant): { readonly at: Date; readonly day: string } {
  const at = toDate(now);
  return { at, day: utcDay(at) };
}

export function errorFields(err: unknown): { readonly kind: string; readonly code?: string } {
  if (isProviderFailure(err)) {
    const { error } = err;
    return 'code' in error ? { kind: error.kind, code: error.code } : { kind: error.kind };
  }
  if (!(err instanceof Error)) return { kind: typeof err };
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? { kind: err.name, code } : { kind: err.name };
}
