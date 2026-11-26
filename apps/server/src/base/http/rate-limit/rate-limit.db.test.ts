import { encodePublicId } from '@kronaut/core';
import { createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BASE,
  createTestInstance,
  createTestUser,
  errorOf,
  insertTestGrant,
  loginAs,
  provisionTestWorkspace,
  randomGrantToken,
  requestAs,
} from '../testing.ts';
import { grantBucketKey } from './limit.ts';

const CLI = { kind: 'cli' } as const;
const GRANT_LIMIT = 3;
const PUBLIC_LIMIT = 2;

let test: TestDatabase;
let root: Database;
let db: Database;
let app: Hono;
let instanceGrantKey: Uint8Array;
let workspaceId: string;
let ownerId: string;
let cookie: string;

function brands(): string {
  return `${BASE}/v1/workspaces/${encodePublicId('workspace', workspaceId)}/brands`;
}

async function grant(perMinute: number | null = null): Promise<{ id: string; token: string }> {
  const token = randomGrantToken();
  const id = await db.withTenant(workspaceId, { kind: 'user', id: ownerId }, async (trx) => {
    const inserted = await insertTestGrant(trx, instanceGrantKey, token, {
      workspaceId,
      sponsorUserId: ownerId,
      scopes: ['brands:read'],
    });
    if (perMinute !== null) {
      await trx
        .updateTable('access_grants')
        .set({ rate_limit_per_min: perMinute })
        .where('id', '=', inserted)
        .execute();
    }
    return inserted;
  });
  return { id, token };
}

function withKey(token: string) {
  return requestAs(app, { bearer: token }, { method: 'GET', url: brands() });
}

async function login(ip: string, extra: Record<string, string> = {}): Promise<Response> {
  return await app.request(`${BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...extra },
    body: JSON.stringify({ email: 'nobody@example.test', password: 'wrong password' }),
  });
}

async function deletion(ip: string): Promise<Response> {
  return await app.request(`${BASE}/v1/meta/facebook/deletion`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': ip },
    body: 'signed_request=CANARY_unsigned.payload',
  });
}

async function statuses(count: number, send: () => Promise<Response>): Promise<number[]> {
  const seen: number[] = [];
  for (let i = 0; i < count; i++) seen.push((await send()).status);
  return seen;
}

beforeAll(async () => {
  test = await startTestDatabase();
  root = createDatabase({ connectionString: test.ownerUrl });
  db = createDatabase({ connectionString: test.appUrl });
  const instance = createTestInstance({
    db,
    rateLimits: { grantPerMinute: GRANT_LIMIT, publicPerMinute: PUBLIC_LIMIT },
    trustCloudflareIp: true,
  });
  app = instance.app;
  instanceGrantKey = instance.deps.keys.grant;
  ownerId = await createTestUser(db, 'owner');
  workspaceId = await provisionTestWorkspace(db, ownerId, 'ws-rate');
  await root.withActor(CLI, (trx) => trx.deleteFrom('rate_buckets').execute());
  cookie = (await loginAs(app, 'owner')).cookie;
});

afterAll(async () => {
  await root?.destroy();
  await db?.destroy();
  await test?.stop();
});

describe('per-grant limit (RL-01)', () => {
  it('answers 429 with Retry-After past the limit, one bucket per key', async () => {
    const first = await grant();
    const second = await grant();
    expect(await statuses(GRANT_LIMIT, () => withKey(first.token))).toEqual([200, 200, 200]);
    const limited = await withKey(first.token);
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);
    const error = await errorOf(limited);
    expect(error.code).toBe('rate_limited');
    expect((await withKey(second.token)).status).toBe(200);
  });

  it("uses the key's own rate_limit_per_min and refills over time", async () => {
    const slow = await grant(1);
    expect(await statuses(2, () => withKey(slow.token))).toEqual([200, 429]);
    const bucket = await root.withActor(CLI, async (trx) => {
      await trx
        .updateTable('rate_buckets')
        .set({ updated_at: sql`updated_at - interval '61 seconds'` })
        .where('key', '=', grantBucketKey(slow.id))
        .execute();
      return await sql<{ capacity: string; tokens: string; refill: string; age: string }>`
        select capacity::text, tokens::text, refill_per_sec::text as refill,
               extract(epoch from now() - updated_at)::text as age
        from rate_buckets where key = ${grantBucketKey(slow.id)}
      `.execute(trx);
    });
    expect(bucket.rows).toHaveLength(1);
    const row = bucket.rows[0];
    expect(Number(row?.capacity)).toBe(1);
    expect(Number(row?.refill)).toBeCloseTo(1 / 60, 6);
    expect(Number(row?.age)).toBeGreaterThanOrEqual(60);
    expect(Number(row?.tokens)).toBeLessThan(1);
    expect((await withKey(slow.token)).status).toBe(200);
  });

  it('leaves signed-in members alone', async () => {
    const seen = await statuses(GRANT_LIMIT + 2, () =>
      requestAs(app, { cookie }, { method: 'GET', url: brands() }),
    );
    expect(seen.every((status) => status === 200)).toBe(true);
  });
});

describe('per-IP limit on public routes (RL-02)', () => {
  it('limits by the Cloudflare client address and ignores X-Forwarded-For', async () => {
    const seen = await statuses(PUBLIC_LIMIT, () => login('203.0.113.7'));
    expect(seen).not.toContain(429);
    const spoofed = await login('203.0.113.7', { 'x-forwarded-for': '198.51.100.1' });
    expect(spoofed.status).toBe(429);
    expect(spoofed.headers.get('retry-after')).not.toBeNull();
    expect((await login('203.0.113.8')).status).not.toBe(429);
  });

  it('keeps one bucket per route family and leaves probes out (ADR-0057)', async () => {
    const ip = '203.0.113.9';
    await statuses(PUBLIC_LIMIT, () => login(ip));
    expect((await login(ip)).status).toBe(429);
    const seen = await statuses(PUBLIC_LIMIT + 1, () => deletion(ip));
    expect(seen.slice(0, PUBLIC_LIMIT)).not.toContain(429);
    expect(seen[PUBLIC_LIMIT]).toBe(429);
    const health = await app.request(`${BASE}/healthz`, { headers: { 'cf-connecting-ip': ip } });
    expect(health.status).toBe(200);
  });

  it('shares one bucket per IPv6 /64 and stores no address', async () => {
    await statuses(PUBLIC_LIMIT, () => login('2001:db8:1:2::1'));
    expect((await login('2001:db8:1:2:ffff::9')).status).toBe(429);
    expect((await login('2001:db8:1:3::1')).status).not.toBe(429);
    const keys = await root.withActor(CLI, (trx) =>
      trx.selectFrom('rate_buckets').select('key').where('key', 'like', 'endpoint:ip:%').execute(),
    );
    expect(keys.length).toBeGreaterThan(0);
    for (const { key } of keys) expect(key).toMatch(/^endpoint:ip:(auth|meta):[0-9a-f]{32}$/);
  });
});
