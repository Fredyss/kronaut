import { isProviderFailure } from '@kronaut/core';
import type { Actor } from '@kronaut/db';
import { Temporal } from 'temporal-polyfill';
import { createBaseContext, PROVIDER_EGRESS, type ProviderEntry } from '../providers.ts';
import type { PublishDeps } from '../publish/task.ts';

export type CapabilitiesDeps = Pick<PublishDeps, 'db' | 'providers' | 'logger' | 'now'>;

export const CAPABILITIES_MAX_AGE = Temporal.Duration.from({ hours: 24 });
const WORKSPACE_PAGE = 1000;
const SYSTEM: Actor = { kind: 'system' };

type Capabilities = Readonly<Record<string, unknown>>;

interface Stale {
  readonly workspaceId: string;
  readonly id: string;
  readonly provider: string;
  readonly host: string;
}

interface Counts {
  accounts: number;
  hosts: number;
  failedHosts: number;
  updated: number;
}

function fetchedBefore(capabilities: unknown, cutoff: Temporal.Instant): boolean {
  const fetchedAt =
    typeof capabilities === 'object' && capabilities !== null
      ? (capabilities as { fetchedAt?: unknown }).fetchedAt
      : undefined;
  if (typeof fetchedAt !== 'string') return true;
  try {
    return Temporal.Instant.compare(Temporal.Instant.from(fetchedAt), cutoff) < 0;
  } catch (error) {
    if (error instanceof RangeError) return true;
    throw error;
  }
}

async function staleAccounts(
  deps: CapabilitiesDeps,
  workspaceId: string,
  providers: readonly string[],
): Promise<Stale[]> {
  const rows = await deps.db.withTenant(workspaceId, SYSTEM, (trx) =>
    trx
      .selectFrom('social_accounts as a')
      .innerJoin('provider_apps as p', 'p.id', 'a.provider_app_id')
      .select(['a.id', 'a.provider', 'a.capabilities', 'p.instance_host'])
      .where('a.workspace_id', '=', workspaceId)
      .where('a.status', '=', 'active')
      .where('a.provider', 'in', providers)
      .where('p.instance_host', '<>', '')
      .execute(),
  );
  const cutoff = deps.now().subtract(CAPABILITIES_MAX_AGE);
  return rows
    .filter((row) => fetchedBefore(row.capabilities, cutoff))
    .map((row) => ({ workspaceId, id: row.id, provider: row.provider, host: row.instance_host }));
}

async function readHost(
  deps: CapabilitiesDeps,
  entry: ProviderEntry,
  host: string,
): Promise<Capabilities | null> {
  const read = entry.runtime.readInstanceCapabilities;
  if (read === undefined) return null;
  const ctx = createBaseContext(
    entry,
    deps.logger,
    AbortSignal.timeout(PROVIDER_EGRESS.timeoutMs),
    deps.now,
  );
  try {
    return await read(ctx, host);
  } catch (err) {
    const reason = isProviderFailure(err) ? err.error.kind : 'error';
    deps.logger.warn(
      { provider: entry.manifest.id, host, reason },
      'instance capabilities refresh failed; keeping the stored values',
    );
    return null;
  }
}

async function store(deps: CapabilitiesDeps, account: Stale, capabilities: Capabilities) {
  const result = await deps.db.withTenant(account.workspaceId, SYSTEM, (trx) =>
    trx
      .updateTable('social_accounts')
      .set({ capabilities: JSON.stringify(capabilities) })
      .where('workspace_id', '=', account.workspaceId)
      .where('id', '=', account.id)
      .where('status', '=', 'active')
      .executeTakeFirst(),
  );
  return Number(result.numUpdatedRows);
}

async function refreshPage(
  deps: CapabilitiesDeps,
  stale: readonly Stale[],
  cache: Map<string, Promise<Capabilities | null>>,
  counts: Counts,
): Promise<void> {
  for (const account of stale) {
    const entry = deps.providers.get(account.provider);
    if (entry === undefined) continue;
    const key = `${account.provider}\n${account.host}`;
    let pending = cache.get(key);
    if (pending === undefined) {
      pending = readHost(deps, entry, account.host);
      cache.set(key, pending);
      counts.hosts++;
      if ((await pending) === null) counts.failedHosts++;
    }
    const capabilities = await pending;
    if (capabilities !== null) counts.updated += await store(deps, account, capabilities);
  }
}

export async function refreshCapabilities(deps: CapabilitiesDeps): Promise<string> {
  const providers = deps.providers
    .list()
    .filter((entry) => entry.runtime.readInstanceCapabilities !== undefined)
    .map((entry) => entry.manifest.id);
  const counts: Counts = { accounts: 0, hosts: 0, failedHosts: 0, updated: 0 };
  if (providers.length === 0) return JSON.stringify(counts);
  const cache = new Map<string, Promise<Capabilities | null>>();
  let after: string | null = null;
  for (;;) {
    const page = await deps.db.sweeps.workspaces(after, WORKSPACE_PAGE);
    for (const workspaceId of page) {
      const stale = await staleAccounts(deps, workspaceId, providers);
      counts.accounts += stale.length;
      await refreshPage(deps, stale, cache, counts);
    }
    after = page.at(-1) ?? null;
    if (page.length < WORKSPACE_PAGE) return JSON.stringify(counts);
  }
}
