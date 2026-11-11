import { createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BASE, createTestInstance, createTestUser, PASSWORD } from '../../base/http/testing.ts';
import {
  LOGIN_FAILURES_PER_ADDRESS,
  LOGIN_FAILURES_PER_EMAIL,
  LOGIN_FAILURES_PER_PAIR,
} from './login-throttle.ts';

const WRONG = 'not the right password';

interface Via {
  readonly app?: Hono;
  readonly forwarded?: string;
}

let test: TestDatabase;
let db: Database;
let root: Database;
let app: Hono;
let behindAccess: Hono;

beforeAll(async () => {
  test = await startTestDatabase();
  db = createDatabase({ connectionString: test.appUrl });
  root = createDatabase({ connectionString: test.ownerUrl });
  app = createTestInstance({ db }).app;
  behindAccess = createTestInstance({ db, access: { verify: async () => ({ ok: true }) } }).app;
  for (const label of ['pair', 'refund', 'spread', 'event', 'left', 'right']) {
    await createTestUser(db, label);
  }
});

afterAll(async () => {
  await Promise.all([db?.destroy(), root?.destroy()]);
  await test?.stop();
});

async function attempt(
  label: string,
  address: string | undefined,
  password: string,
  via: Via = {},
): Promise<number> {
  const forwarded = via.forwarded === undefined ? {} : { 'cf-connecting-ip': via.forwarded };
  const response = await (via.app ?? app).request(
    `${BASE}/v1/auth/login`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...forwarded },
      body: JSON.stringify({ email: `${label}@example.test`, password }),
    },
    address === undefined ? undefined : { incoming: { socket: { remoteAddress: address } } },
  );
  if (response.status === 429) {
    expect(await response.json()).toMatchObject({ error: { code: 'rate_limited' } });
  }
  return response.status;
}

function signIn(label: string, address: string): Promise<number> {
  return attempt(label, address, PASSWORD);
}

async function fail(label: string, address: string | undefined, times: number, via?: Via) {
  const statuses: number[] = [];
  for (let n = 0; n < times; n++) statuses.push(await attempt(label, address, WRONG, via));
  return statuses;
}

function all(status: number, times: number): number[] {
  return Array.from({ length: times }, () => status);
}

describe('RL-02 sign_in_throttle', () => {
  it('blocks an address and email after 5 failures, whatever the password', async () => {
    expect(await fail('pair', '203.0.113.10', LOGIN_FAILURES_PER_PAIR)).toEqual(
      all(401, LOGIN_FAILURES_PER_PAIR),
    );
    expect(await signIn('pair', '203.0.113.10')).toBe(429);
    expect(await signIn('pair', '203.0.113.200')).toBe(429);
    expect(await signIn('pair', '203.0.114.10')).toBe(200);
  });

  it('does not let a blocked email use up its address', async () => {
    expect(await fail('pair', '203.0.113.10', LOGIN_FAILURES_PER_ADDRESS)).toEqual(
      all(429, LOGIN_FAILURES_PER_ADDRESS),
    );
    expect(await attempt('neighbour', '203.0.113.10', WRONG)).toBe(401);
  });

  it('treats an unknown email, and a caller without a readable address, the same way', async () => {
    expect(await fail('nobody', '198.51.100.1', LOGIN_FAILURES_PER_PAIR + 1)).toEqual([
      ...all(401, LOGIN_FAILURES_PER_PAIR),
      429,
    ]);
    expect(await fail('nowhere', undefined, LOGIN_FAILURES_PER_PAIR + 1)).toEqual([
      ...all(401, LOGIN_FAILURES_PER_PAIR),
      429,
    ]);
  });

  it('does not count a successful sign-in', async () => {
    await fail('refund', '192.0.2.1', LOGIN_FAILURES_PER_PAIR - 1);
    for (let n = 0; n < 3; n++) expect(await signIn('refund', '192.0.2.1')).toBe(200);
    expect(await attempt('refund', '192.0.2.1', WRONG)).toBe(401);
    expect(await signIn('refund', '192.0.2.1')).toBe(429);
  });

  it('signs in every time when sign-ins from one address overlap', async () => {
    const loop = async (label: string) => {
      const statuses: number[] = [];
      for (let n = 0; n < 120; n++) statuses.push(await signIn(label, '192.0.2.50'));
      return statuses;
    };
    const statuses = (await Promise.all([loop('left'), loop('left'), loop('right')])).flat();
    expect(statuses).toEqual(all(200, 360));
  }, 120_000);

  it('blocks an address after 30 failures across emails', async () => {
    for (let n = 0; n < LOGIN_FAILURES_PER_ADDRESS; n++) {
      expect(await attempt(`sprayed-${n}`, '2001:db8:1:2::9', WRONG)).toBe(401);
    }
    expect(await attempt('sprayed-new', '2001:db8:1:ffff::1', WRONG)).toBe(429);
    expect(await attempt('sprayed-new', '2001:db8:2::1', WRONG)).toBe(401);
  });

  it('blocks an email after 100 failures spread over addresses', async () => {
    const perAddress = LOGIN_FAILURES_PER_PAIR - 1;
    for (let n = 0; n < LOGIN_FAILURES_PER_EMAIL / perAddress; n++) {
      expect(await fail('spread', `10.${n}.0.1`, perAddress)).toEqual(all(401, perAddress));
    }
    expect(await signIn('spread', '10.250.0.1')).toBe(429);
  }, 120_000);

  it('reads cf-connecting-ip only on a request that passed Access', async () => {
    const gated = { app: behindAccess, forwarded: '198.18.0.1' };
    expect(await fail('gated', '10.9.9.9', LOGIN_FAILURES_PER_PAIR + 1, gated)).toEqual([
      ...all(401, LOGIN_FAILURES_PER_PAIR),
      429,
    ]);
    const elsewhere = { app: behindAccess, forwarded: '198.18.1.1' };
    expect(await attempt('gated', '10.9.9.9', WRONG, elsewhere)).toBe(401);

    const statuses: number[] = [];
    for (let n = 0; n <= LOGIN_FAILURES_PER_PAIR; n++) {
      statuses.push(await attempt('open', '10.8.8.8', WRONG, { forwarded: `198.18.${n}.1` }));
    }
    expect(statuses).toEqual([...all(401, LOGIN_FAILURES_PER_PAIR), 429]);
  });

  it('records the address prefix on the event and no email or address in a bucket key', async () => {
    expect(await attempt('event', '::ffff:172.16.5.77', WRONG)).toBe(401);
    const { events, keys } = await root.withActor({ kind: 'system' }, async (trx) => ({
      events: await sql<{ prefix: string }>`
        select host(ip_prefix) || '/' || masklen(ip_prefix) as prefix
          from security_events where ip_prefix << '172.16.0.0/12'::inet
      `.execute(trx),
      keys: await sql<{ key: string }>`
        select key from rate_buckets where key like 'endpoint:login:%'
      `.execute(trx),
    }));
    expect(events.rows).toEqual([{ prefix: '172.16.5.0/24' }]);
    expect(keys.rows.length).toBeGreaterThan(0);
    for (const { key } of keys.rows) {
      expect(key).toMatch(/^endpoint:login:(address|pair|email):[A-Za-z0-9_-]{43}$/);
    }
  });
});
