import type { LookupAddress } from 'node:dns';
import { describe, expect, it } from 'vitest';
import { EgressError } from './errors.ts';
import { createGuardedLookup, type Resolver } from './lookup.ts';

interface LookupOutcome {
  error: NodeJS.ErrnoException | null;
  address: string | LookupAddress[] | undefined;
  family: number | undefined;
}

function staticResolver(...records: { address: string; family: 4 | 6 }[]): Resolver {
  return async () => records;
}

function run(
  resolver: Resolver,
  options: { all?: boolean; family?: number } = {},
): Promise<LookupOutcome> {
  const lookup = createGuardedLookup(resolver);
  return new Promise((resolve) => {
    lookup('api.example.com', options, (error, address, family) => {
      resolve({ error, address, family });
    });
  });
}

const PUBLIC_V4 = { address: '93.184.216.34', family: 4 } as const;
const PUBLIC_V6 = { address: '2606:4700:4700::1111', family: 6 } as const;
const PRIVATE_V4 = { address: '10.0.0.5', family: 4 } as const;
const LOOPBACK_V6 = { address: '::1', family: 6 } as const;

describe('createGuardedLookup', () => {
  it('returns every address when all is requested and all are public', async () => {
    const outcome = await run(staticResolver(PUBLIC_V4, PUBLIC_V6), { all: true });
    expect(outcome.error).toBeNull();
    expect(outcome.address).toEqual([PUBLIC_V4, PUBLIC_V6]);
  });

  it('returns the first address and its family in the single-address shape', async () => {
    const outcome = await run(staticResolver(PUBLIC_V6, PUBLIC_V4));
    expect(outcome.error).toBeNull();
    expect(outcome.address).toBe(PUBLIC_V6.address);
    expect(outcome.family).toBe(6);
  });

  it('honours a requested family without weakening validation', async () => {
    const v4 = await run(staticResolver(PUBLIC_V6, PUBLIC_V4), { all: true, family: 4 });
    expect(v4.address).toEqual([PUBLIC_V4]);
    const v6 = await run(staticResolver(PUBLIC_V4, PUBLIC_V6), { family: 6 });
    expect(v6.address).toBe(PUBLIC_V6.address);
    expect(v6.family).toBe(6);
  });

  it('fails with dns_failure when the requested family has no records', async () => {
    const outcome = await run(staticResolver(PUBLIC_V4), { all: true, family: 6 });
    expect(outcome.error).toBeInstanceOf(EgressError);
    expect((outcome.error as EgressError).code).toBe('dns_failure');
  });

  it('rejects mixed public and private answers in both callback shapes', async () => {
    for (const options of [{ all: true }, {}]) {
      const outcome = await run(staticResolver(PUBLIC_V4, PRIVATE_V4), options);
      expect(outcome.error).toBeInstanceOf(EgressError);
      expect((outcome.error as EgressError).code).toBe('blocked_address');
    }
  });

  it('rejects a private address even when the requested family excludes it', async () => {
    const outcome = await run(staticResolver(PUBLIC_V4, LOOPBACK_V6), { all: true, family: 4 });
    expect((outcome.error as EgressError).code).toBe('blocked_address');
  });

  it('rejects private-only answers in both callback shapes', async () => {
    for (const options of [{ all: true }, {}]) {
      const outcome = await run(staticResolver(PRIVATE_V4, LOOPBACK_V6), options);
      expect(outcome.error).toBeInstanceOf(EgressError);
      expect((outcome.error as EgressError).code).toBe('blocked_address');
    }
  });

  it('rejects an ipv4-mapped answer', async () => {
    const outcome = await run(staticResolver({ address: '::ffff:8.8.8.8', family: 6 }));
    expect((outcome.error as EgressError).code).toBe('blocked_address');
  });

  it('rejects an unparseable address', async () => {
    const outcome = await run(staticResolver({ address: 'not-an-ip', family: 4 }));
    expect((outcome.error as EgressError).code).toBe('blocked_address');
  });

  it('fails with dns_failure on an empty answer in both callback shapes', async () => {
    for (const options of [{ all: true }, {}]) {
      const outcome = await run(staticResolver(), options);
      expect(outcome.error).toBeInstanceOf(EgressError);
      expect((outcome.error as EgressError).code).toBe('dns_failure');
    }
  });

  it('wraps resolver failures as dns_failure and keeps the cause', async () => {
    const cause = Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' });
    const outcome = await run(async () => {
      throw cause;
    });
    expect(outcome.error).toBeInstanceOf(EgressError);
    expect((outcome.error as EgressError).code).toBe('dns_failure');
    expect(outcome.error?.cause).toBe(cause);
  });

  it('derives the family from the address rather than trusting the resolver', async () => {
    const outcome = await run(staticResolver({ address: PUBLIC_V6.address, family: 4 }), {
      all: true,
    });
    expect(outcome.address).toEqual([PUBLIC_V6]);
  });

  it('resolves the hostname it is called with', async () => {
    const seen: string[] = [];
    const lookup = createGuardedLookup(async (hostname) => {
      seen.push(hostname);
      return [PUBLIC_V4];
    });
    await new Promise<void>((resolve) => {
      lookup('Example.test', { all: true }, () => resolve());
    });
    expect(seen).toEqual(['Example.test']);
  });
});
