import { randomUUID } from 'node:crypto';
import type { IssuedCredentials, ProviderManifest } from '@kronaut/core';
import type { SweepRow } from '@kronaut/db';
import { toProviderFailure } from '@kronaut/providers/failure';
import { Temporal } from 'temporal-polyfill';
import { loadCredentialById, type RefreshableCredential } from '../credential-store.ts';
import { createBaseContext, type ProviderEntry } from '../providers.ts';
import { expiringAt, openExpiring, type Renewal, warningState } from './expiring.ts';
import { flagAccount, flagApp } from './incidents.ts';
import { SYSTEM } from './lock.ts';
import {
  acquire,
  canRefresh,
  classify,
  consumesToken,
  persist,
  release,
  waitForVersion,
} from './refresh-lease.ts';
import type { PublishDeps } from './task.ts';

export type RefreshMode = 'wait' | 'skip';

export type RefreshOutcome =
  | { readonly kind: 'refreshed'; readonly version: number }
  | { readonly kind: 'skipped' }
  | { readonly kind: 'rejected'; readonly lost: boolean; readonly fromVersion: number }
  | { readonly kind: 'app'; readonly code: string }
  | { readonly kind: 'transient' };

export type RefreshDeps = Pick<
  PublishDeps,
  'db' | 'keyring' | 'providers' | 'logger' | 'workerId' | 'publicBaseUrl' | 'now'
>;

export interface RefreshTarget {
  readonly workspaceId: string;
  readonly credentialId: string;
  readonly expectedVersion: number;
}

const ACCESS_LEAD_MS = 15 * 60_000;
const SWEEP_WINDOW = 1000;

export async function refreshCredential(
  deps: RefreshDeps,
  target: RefreshTarget,
  mode: RefreshMode,
): Promise<RefreshOutcome> {
  const owner = `${deps.workerId}:${randomUUID()}`;
  const acquired = await acquire(deps, target, owner);
  if (acquired.kind === 'done') return acquired.outcome;
  if (acquired.kind === 'held') {
    return mode === 'skip' ? { kind: 'skipped' } : await waitForVersion(deps, target);
  }

  const { entry, takeover } = acquired;
  const kind = entry.manifest.auth.refresh;
  const logger = deps.logger.child({
    credentialId: target.credentialId,
    provider: acquired.provider,
  });
  if (takeover) logger.warn('took over an expired refresh lease');
  const { runtime } = entry;
  if (runtime.refresh === undefined)
    throw new Error(`provider ${acquired.provider} cannot refresh`);

  let issued: IssuedCredentials<unknown>;
  try {
    issued = await runtime.refresh(
      createBaseContext(entry, logger, new AbortController().signal, deps.now),
      { app: acquired.app, account: acquired.account, credentials: acquired.credentials },
    );
  } catch (err) {
    const error = toProviderFailure(err, consumesToken(kind) ? 'public' : 'private').error;
    if (error.kind === 'ambiguous' && consumesToken(kind)) {
      logger.error(
        'a refresh of a single-use token has an unknown outcome; the lease is kept until it expires',
      );
    } else {
      await release(deps, target, owner, logger);
    }
    return classify(error, kind, takeover, target.expectedVersion);
  }
  return await persist(deps, { target, owner, provider: acquired.provider, logger }, issued);
}

function within(at: Date | null, now: Temporal.Instant, leadMs: number): boolean {
  if (at === null) return false;
  const expiresAt = Temporal.Instant.fromEpochMilliseconds(at.getTime());
  return Temporal.Instant.compare(expiresAt, now.add({ milliseconds: leadMs })) <= 0;
}

function isDue(
  auth: ProviderManifest['auth'],
  credential: RefreshableCredential,
  now: Temporal.Instant,
): boolean {
  if (within(credential.accessExpiresAt, now, ACCESS_LEAD_MS)) return true;
  if (auth.refresh === 'self_refresh') {
    return within(credential.accessExpiresAt, now, auth.warnLeadMs);
  }
  if (consumesToken(auth.refresh)) {
    return within(credential.refreshExpiresAt, now, auth.warnLeadMs);
  }
  return false;
}

interface Swept {
  readonly row: SweepRow;
  readonly credential: RefreshableCredential;
  readonly entry: ProviderEntry;
}

type SweepCounts = Record<
  RefreshOutcome['kind'] | 'due' | 'expiring' | 'alreadyWarned' | 'failed',
  number
>;

type SweepHandler = (deps: RefreshDeps, row: SweepRow, counts: SweepCounts) => Promise<void>;

interface SweepPass {
  readonly name: 'refresh' | 'warn';
  readonly leadMs: number;
  readonly window: number;
}

async function flagOutcome(
  deps: RefreshDeps,
  swept: Swept,
  outcome: RefreshOutcome,
): Promise<void> {
  const { row, credential } = swept;
  if (outcome.kind === 'rejected') {
    await deps.db.withTenant(row.workspaceId, SYSTEM, (trx) =>
      flagAccount(trx, {
        workspaceId: row.workspaceId,
        socialAccountId: credential.socialAccountId,
        fence: { id: row.id, version: outcome.fromVersion },
        incident: outcome.lost ? 'refresh_token_lost' : 'auth_revoked',
      }),
    );
  } else if (outcome.kind === 'app') {
    await deps.db.withTenant(row.workspaceId, SYSTEM, (trx) =>
      flagApp(trx, row.workspaceId, credential.providerAppId, outcome.code),
    );
  }
}

async function warnIfExpiring(
  deps: RefreshDeps,
  swept: Swept,
  renewal: Renewal,
  now: Temporal.Instant,
): Promise<boolean> {
  const { row, credential, entry } = swept;
  const expiresAt = expiringAt(entry.manifest.auth, credential, now, renewal);
  if (expiresAt === null) return false;
  return await deps.db.withTenant(row.workspaceId, SYSTEM, (trx) =>
    openExpiring(trx, {
      workspaceId: row.workspaceId,
      socialAccountId: credential.socialAccountId,
      provider: credential.provider,
      expiresAt,
    }),
  );
}

function loadSwept(deps: RefreshDeps, row: SweepRow): Promise<RefreshableCredential | null> {
  return deps.db.withTenant(row.workspaceId, SYSTEM, (trx) =>
    loadCredentialById(trx, deps.keyring, { workspaceId: row.workspaceId, credentialId: row.id }),
  );
}

const refreshRow: SweepHandler = async (deps, row, counts) => {
  const credential = await loadSwept(deps, row);
  if (credential === null) return;
  const entry = deps.providers.get(credential.provider);
  const now = deps.now();
  if (!canRefresh(entry) || !isDue(entry.manifest.auth, credential, now)) return;
  counts.due++;
  const outcome = await refreshCredential(
    deps,
    { workspaceId: row.workspaceId, credentialId: row.id, expectedVersion: credential.version },
    'skip',
  );
  counts[outcome.kind]++;
  const swept: Swept = { row, credential, entry };
  await flagOutcome(deps, swept, outcome);
  if (await warnIfExpiring(deps, swept, outcome, now)) counts.expiring++;
};

const warnRow: SweepHandler = async (deps, row, counts) => {
  const state = await deps.db.withTenant(row.workspaceId, SYSTEM, (trx) =>
    warningState(trx, row.workspaceId, row.id),
  );
  if (state === undefined || canRefresh(deps.providers.get(state.provider))) return;
  if (state.warned) {
    counts.alreadyWarned++;
    return;
  }
  const credential = await loadSwept(deps, row);
  const entry = credential === null ? undefined : deps.providers.get(credential.provider);
  if (credential === null || entry === undefined) return;
  const swept: Swept = { row, credential, entry };
  if (await warnIfExpiring(deps, swept, 'unrefreshable', deps.now())) counts.expiring++;
};

async function runPass(
  deps: RefreshDeps,
  pass: SweepPass,
  counts: SweepCounts,
  handle: SweepHandler,
): Promise<void> {
  const rows = await deps.db.sweeps.expiringCredentials(pass.leadMs / 1000, pass.window);
  if (rows.length === pass.window) {
    deps.logger.warn(
      { task: 'credential_refresh', pass: pass.name, window: pass.window },
      'the credential sweep window is full; credentials past it wait for a later run',
    );
  }
  for (const row of rows) {
    try {
      await handle(deps, row, counts);
    } catch (err) {
      counts.failed++;
      deps.logger.error(
        { err, task: 'credential_refresh', pass: pass.name, credentialId: row.id },
        'refreshing a credential failed',
      );
    }
  }
}

function warnLead(entry: ProviderEntry): number {
  return entry.manifest.auth.warnLeadMs;
}

export async function refreshExpiring(
  deps: RefreshDeps,
  window: number = SWEEP_WINDOW,
): Promise<string> {
  const entries = deps.providers.list();
  const refreshable = entries.filter(canRefresh);
  const unrefreshable = entries.filter((entry) => !canRefresh(entry));
  const counts: SweepCounts = {
    due: 0,
    refreshed: 0,
    skipped: 0,
    rejected: 0,
    app: 0,
    transient: 0,
    expiring: 0,
    alreadyWarned: 0,
    failed: 0,
  };
  const refreshLeadMs = Math.max(ACCESS_LEAD_MS, ...refreshable.map(warnLead));
  await runPass(deps, { name: 'refresh', leadMs: refreshLeadMs, window }, counts, refreshRow);
  if (unrefreshable.length > 0) {
    const warnLeadMs = Math.max(...unrefreshable.map(warnLead));
    await runPass(deps, { name: 'warn', leadMs: warnLeadMs, window }, counts, warnRow);
  }
  return JSON.stringify(counts);
}
