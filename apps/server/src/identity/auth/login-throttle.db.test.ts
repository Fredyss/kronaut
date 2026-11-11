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

let test: TestDatabase;
let db: Database;
let root: Database;
let app: Hono;

beforeAll(async () => {
  test = await startTestDatabase();
  db = createDatabase({ connectionString: test.appUrl });
  root = createDatabase({ connectionString: test.ownerUrl });
  app = createTestInstance({ db }).app;
  for (const label of ['pair', 'refund', 'spread', 'event']) await createTestUser(db, label);
});

afterAll(async () => {
  await Promise.all([db?.destroy(), root?.destroy()]);
  await test?.stop();
});

async function signIn(label: string, address: string, password = PASSWORD): Promise<number> {
  const response = await app.request(
    `${BASE}/v1/auth/login`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: `${label}@example.test`, password }),
    },
    { incoming: { socket: { remoteAddress: address } } },
  );
  if (response.status === 429) {
    expect(await response.json()).toMatchObject({ error: { code: 'rate_limited' } });
  }
  return response.status;
}

async function fail(label: string, address: string, times: number): Promise<number[]> {
  const statuses: number[] = [];
  for (let n = 0; n < times; n++) statuses.push(await signIn(label, address, WRONG));
  return statuses;
}

describe('RL-02 sign_in_throttle', () => {
  it('blocks an address and email after 5 failures, whatever the password', async () => {
    const failures = await fail('pair', '203.0.113.10', LOGIN_FAILURES_PER_PAIR);
    expect(failures).toEqual(failures.map(() => 401));
    expect(await signIn('pair', '203.0.113.10')).toBe(429);
    expect(await signIn('pair', '203.0.113.200')).toBe(429);
    expect(await signIn('pair', '203.0.114.10')).toBe(200);
  });

  it('treats an unknown email the same way', async () => {
    const failures = await fail('nobody', '198.51.100.1', LOGIN_FAILURES_PER_PAIR);
    expect(failures).toEqual(failures.map(() => 401));
    expect(await signIn('nobody', '198.51.100.1', WRONG)).toBe(429);
  });

  it('does not count a successful sign-in', async () => {
    await fail('refund', '192.0.2.1', LOGIN_FAILURES_PER_PAIR - 1);
    for (let n = 0; n < 3; n++) expect(await signIn('refund', '192.0.2.1')).toBe(200);
    expect(await signIn('refund', '192.0.2.1', WRONG)).toBe(401);
    expect(await signIn('refund', '192.0.2.1')).toBe(429);
  });

  it('blocks an address after 30 failures across emails', async () => {
    for (let n = 0; n < LOGIN_FAILURES_PER_ADDRESS; n++) {
      expect(await signIn(`sprayed-${n}`, '2001:db8:1:2::9', WRONG)).toBe(401);
    }
    expect(await signIn('sprayed-new', '2001:db8:1:ffff::1', WRONG)).toBe(429);
    expect(await signIn('sprayed-new', '2001:db8:2::1', WRONG)).toBe(401);
  });

  it('blocks an email after 100 failures spread over addresses', async () => {
    const perAddress = LOGIN_FAILURES_PER_PAIR - 1;
    for (let n = 0; n < LOGIN_FAILURES_PER_EMAIL / perAddress; n++) {
      const statuses = await fail('spread', `10.${n}.0.1`, perAddress);
      expect(statuses).toEqual(statuses.map(() => 401));
    }
    expect(await signIn('spread', '10.250.0.1')).toBe(429);
  }, 120_000);

  it('records the address prefix on the event and no email or address in a bucket key', async () => {
    expect(await signIn('event', '::ffff:172.16.5.77', WRONG)).toBe(401);
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
