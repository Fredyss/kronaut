import type { ProviderManifest, ProviderRuntime } from '@kronaut/core';
import type { HttpClient } from '@kronaut/egress';
import { Temporal } from 'temporal-polyfill';
import { describe, expect, it, vi } from 'vitest';
import { createBaseContext, createProviderRegistry } from './providers.ts';

function manifest(id: string, egressHosts: string[] = [`api.${id}.test`]): ProviderManifest {
  return { id, egressHosts } as unknown as ProviderManifest;
}

function runtime(id: string): ProviderRuntime {
  return { id } as unknown as ProviderRuntime;
}

const http = {} as HttpClient;

describe('createProviderRegistry', () => {
  it('pairs manifests with runtimes and builds one client each', () => {
    const makeHttp = vi.fn(() => http);
    const registry = createProviderRegistry(
      [manifest('alpha'), manifest('beta')],
      [runtime('beta'), runtime('alpha')],
      makeHttp,
    );
    expect(registry.list().map((e) => e.manifest.id)).toEqual(['alpha', 'beta']);
    expect(registry.get('beta')?.runtime.id).toBe('beta');
    expect(registry.get('gamma')).toBeUndefined();
    expect(makeHttp).toHaveBeenCalledTimes(2);
  });

  it('refuses unpaired or duplicate providers', () => {
    const make = () => http;
    expect(() => createProviderRegistry([manifest('a')], [], make)).toThrow(/no runtime/);
    expect(() => createProviderRegistry([], [runtime('a')], make)).toThrow(/no manifest/);
    expect(() =>
      createProviderRegistry([manifest('a'), manifest('a')], [runtime('a')], make),
    ).toThrow(/duplicate/);
    expect(() => createProviderRegistry([manifest('a', [])], [runtime('a')], make)).toThrow(
      /egress/,
    );
  });

  it('builds real egress clients by default', () => {
    const registry = createProviderRegistry([manifest('a', ['*'])], [runtime('a')]);
    expect(typeof registry.get('a')?.http.request).toBe('function');
  });
});

describe('createBaseContext', () => {
  it('hands the provider its own client and clock', () => {
    const registry = createProviderRegistry([manifest('a')], [runtime('a')], () => http);
    const entry = registry.get('a');
    if (entry === undefined) throw new Error('missing');
    const now = Temporal.Instant.from('2026-10-21T00:00:00Z');
    const logger = { debug() {}, info() {}, warn() {}, error() {} };
    const ctx = createBaseContext(entry, logger, AbortSignal.timeout(1000), () => now);
    expect(ctx.http).toBe(http);
    expect(ctx.now()).toBe(now);
  });
});
