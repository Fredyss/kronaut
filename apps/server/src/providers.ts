import type {
  BaseContext,
  ProviderDns,
  ProviderLogger,
  ProviderManifest,
  ProviderRuntime,
} from '@kronaut/core';
import { createHttpClient, type HttpClient, resolveTxt } from '@kronaut/egress';
import { Temporal } from 'temporal-polyfill';

export const PROVIDER_EGRESS = {
  maxResponseBytes: 16 * 1024 * 1024,
  timeoutMs: 30_000,
  maxRedirects: 3,
} as const;

const PROVIDER_DNS_TIMEOUT_MS = 5_000;

const providerDns: ProviderDns = {
  txt: (name) => resolveTxt(name, { timeoutMs: PROVIDER_DNS_TIMEOUT_MS }),
};

export interface ProviderEntry {
  readonly manifest: ProviderManifest;
  readonly runtime: ProviderRuntime;
  readonly http: HttpClient;
}

export interface ProviderRegistry {
  get(id: string): ProviderEntry | undefined;
  list(): readonly ProviderEntry[];
}

export type HttpFactory = (manifest: ProviderManifest) => HttpClient;

function defaultHttp(manifest: ProviderManifest): HttpClient {
  return createHttpClient({
    ...PROVIDER_EGRESS,
    allowedHosts: manifest.egressHosts.includes('*') ? 'any' : manifest.egressHosts,
  });
}

export function createProviderRegistry(
  manifests: readonly ProviderManifest[],
  runtimes: readonly ProviderRuntime[],
  makeHttp: HttpFactory = defaultHttp,
): ProviderRegistry {
  const byId = new Map<string, ProviderRuntime>();
  for (const runtime of runtimes) {
    if (byId.has(runtime.id)) throw new Error(`duplicate provider runtime ${runtime.id}`);
    byId.set(runtime.id, runtime);
  }
  const entries = new Map<string, ProviderEntry>();
  for (const manifest of manifests) {
    const runtime = byId.get(manifest.id);
    if (runtime === undefined) throw new Error(`provider ${manifest.id} has no runtime`);
    if (entries.has(manifest.id)) throw new Error(`duplicate provider manifest ${manifest.id}`);
    if (manifest.egressHosts.length === 0)
      throw new Error(`provider ${manifest.id} has no egress hosts`);
    entries.set(manifest.id, { manifest, runtime, http: makeHttp(manifest) });
  }
  for (const id of byId.keys()) {
    if (!entries.has(id)) throw new Error(`provider runtime ${id} has no manifest`);
  }
  const list = [...entries.values()];
  return {
    get: (id) => entries.get(id),
    list: () => list,
  };
}

export function createBaseContext(
  entry: ProviderEntry,
  logger: ProviderLogger,
  signal: AbortSignal,
  now: () => Temporal.Instant = () => Temporal.Now.instant(),
): BaseContext {
  return { http: entry.http, dns: providerDns, logger, signal, now };
}
