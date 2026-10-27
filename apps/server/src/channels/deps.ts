import type { CredentialKind, ProviderApp, ProviderManifest } from '@kronaut/core';
import type { Keyring } from '@kronaut/credentials';
import type { Actor, Database } from '@kronaut/db';
import type { Temporal } from 'temporal-polyfill';
import { loadProviderApp, type SigningKeyRequest } from '../credential-store.ts';
import type { HttpKeys } from '../http/kernel.ts';
import type { RequestContext } from '../http/types.ts';
import {
  createBaseContext,
  PROVIDER_EGRESS,
  type ProviderEntry,
  type ProviderRegistry,
} from '../providers.ts';

export interface ChannelRouteDeps {
  readonly db: Database;
  readonly keys: Pick<HttpKeys, 'session' | 'oauthPending'>;
  readonly keyring: Keyring;
  readonly providers: ProviderRegistry;
  readonly publicBaseUrl: string;
  clock(): Temporal.Instant;
}

export const SYSTEM: Actor = { kind: 'system' };
export const PROVIDER_ID = /^[a-z0-9_]{2,32}$/;

const REDIRECT_CONNECT_KINDS: ReadonlySet<CredentialKind> = new Set(['oauth', 'page_token']);

export function connectsByRedirect(manifest: ProviderManifest): boolean {
  return REDIRECT_CONNECT_KINDS.has(manifest.auth.kind);
}

export function oauthEntry(providers: ProviderRegistry, id: string): ProviderEntry | undefined {
  const entry = providers.get(id);
  return entry !== undefined && connectsByRedirect(entry.manifest) ? entry : undefined;
}

export function redirectUri(deps: ChannelRouteDeps, provider: string): string {
  return new URL(`/v1/oauth/${provider}/callback`, deps.publicBaseUrl).toString();
}

export function providerContext(deps: ChannelRouteDeps, entry: ProviderEntry, ctx: RequestContext) {
  return createBaseContext(
    entry,
    ctx.logger.child({ provider: entry.manifest.id }),
    AbortSignal.timeout(PROVIDER_EGRESS.timeoutMs),
    deps.clock,
  );
}

export async function loadApp(
  deps: ChannelRouteDeps,
  appId: string,
  keys: SigningKeyRequest,
): Promise<ProviderApp | null> {
  const stored = await deps.db.withActor(SYSTEM, (trx) =>
    loadProviderApp(trx, deps.keyring, { id: appId }, { publicBaseUrl: deps.publicBaseUrl, keys }),
  );
  return stored === null || stored.status !== 'active' || stored.signingKeyMissing
    ? null
    : stored.app;
}
