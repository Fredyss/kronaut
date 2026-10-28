import { randomBytes, randomUUID } from 'node:crypto';
import { defineRoute } from '@kronaut/contract';
import { encodePublicId } from '@kronaut/core';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as z from 'zod';
import { authRoutes } from '../auth/routes.ts';
import { SESSION_COOKIE } from '../auth/session.ts';
import { hashPassword } from '../password.ts';
import { HttpError } from './errors.ts';
import { createHttpApp, deriveHttpKeys } from './kernel.ts';
import { bindRoute } from './types.ts';

const SYSTEM: Actor = { kind: 'system' };
const NOW = Temporal.Now.instant();
const BASE = 'https://kronaut.example.test';
const EMAIL = 'kernel@example.test';
const PASSWORD = 'correct horse battery';

const brandRoute = defineRoute({
  id: 'probe.brand',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/probe-brands',
  auth: ['session', 'grant'],
  action: 'brands:write',
  params: z.object({ workspaceId: z.string() }),
  body: z.object({ slug: z.string(), fail: z.boolean() }),
  response: z.object({ slug: z.string() }),
  status: 201,
  idempotency: true,
  summary: 'Probe brand',
});

const scheduleRoute = defineRoute({
  id: 'probe.schedule',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/probe-schedule',
  auth: 'session',
  action: 'posts:schedule',
  params: z.object({ workspaceId: z.string() }),
  body: z.object({ slug: z.string(), mode: z.enum(['skip', 'missing', 'approved']) }),
  response: z.object({}),
  summary: 'Probe schedule',
});

let test: TestDatabase;
let db: Database;
let app: Hono;
let userId: string;
let workspaceId: string;
let workspacePublicId: string;
let cookie: string;
let runs = 0;

async function brandCount(slug: string): Promise<number> {
  return await db.withTenant(workspaceId, { kind: 'user', id: userId }, async (trx) => {
    const result = await sql<{ n: number }>`
      select count(*)::int as n from brands where workspace_id = ${workspaceId} and slug = ${slug}
    `.execute(trx);
    return result.rows[0]?.n ?? 0;
  });
}

beforeAll(async () => {
  test = await startTestDatabase();
  db = createDatabase({ connectionString: test.appUrl });
  const hash = await hashPassword(PASSWORD);
  userId = await db.withActor(SYSTEM, async (trx) => {
    const result = await sql<{ id: string }>`
      select auth_create_user(${EMAIL}, ${EMAIL}, 'Kernel', ${hash}, 'en') as id
    `.execute(trx);
    return result.rows[0]?.id ?? '';
  });
  workspaceId = await db.withActor({ kind: 'user', id: userId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id
        from provision_organization('Org Kernel', 'Workspace Kernel', 'ws-kernel', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  workspacePublicId = encodePublicId('workspace', workspaceId);
  const deps = {
    db,
    keys: deriveHttpKeys(randomBytes(32)),
    logger: pino({ level: 'silent' }),
    clock: () => NOW,
    publicBaseUrl: BASE,
    readiness: async () => true,
  };
  const insertBrand = (slug: string) =>
    sql`insert into brands (workspace_id, name, slug) values (${workspaceId}, ${slug}, ${slug})`;
  app = createHttpApp(deps, [
    ...authRoutes(deps),
    bindRoute(brandRoute, async ({ body }, ctx) => {
      runs += 1;
      await ctx.tenant((trx) => insertBrand(body.slug).execute(trx));
      if (body.fail) throw new HttpError('conflict', 'probe failure');
      return { status: 201, body: { slug: body.slug } };
    }),
    bindRoute(scheduleRoute, async ({ body }, ctx) => {
      await ctx.tenant(async (trx) => {
        if (body.mode !== 'skip') {
          const approval = body.mode === 'approved' ? 'approved' : 'missing';
          ctx.authorize('posts:schedule', { workspaceId }, { approval });
        }
        await insertBrand(body.slug).execute(trx);
      });
      return { body: {} };
    }),
  ]);
  const signedIn = await app.request(`${BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const header = signedIn.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  cookie = header?.split(';')[0] ?? '';
});

afterAll(async () => {
  await db?.destroy();
  await test?.stop();
});

async function post(
  path: string,
  body: unknown,
  key: string | null = randomUUID(),
): Promise<Response> {
  return await app.request(`${BASE}/v1/workspaces/${workspacePublicId}/${path}`, {
    method: 'POST',
    headers: {
      cookie,
      origin: BASE,
      'content-type': 'application/json',
      ...(key === null ? {} : { 'idempotency-key': key }),
    },
    body: JSON.stringify(body),
  });
}

describe('idempotent writes', () => {
  it('requires a key with 428', async () => {
    expect((await post('probe-brands', { slug: 'no-key', fail: false }, null)).status).toBe(428);
  });

  it('replays a committed write without running it again', async () => {
    runs = 0;
    const first = await post('probe-brands', { slug: 'once', fail: false }, 'key-once-0001');
    expect(first.status).toBe(201);
    const again = await post('probe-brands', { slug: 'once', fail: false }, 'key-once-0001');
    expect(again.status).toBe(201);
    expect(again.headers.get('idempotent-replayed')).toBe('true');
    expect(await again.json()).toEqual({ slug: 'once' });
    expect(runs).toBe(1);
    expect(await brandCount('once')).toBe(1);
  });

  it('rolls back the write and the reservation when the handler fails', async () => {
    const failed = await post('probe-brands', { slug: 'rolled', fail: true }, 'key-fail-0001');
    expect(failed.status).toBe(409);
    expect(await brandCount('rolled')).toBe(0);
    const retried = await post('probe-brands', { slug: 'rolled', fail: false }, 'key-fail-0001');
    expect(retried.status).toBe(201);
    expect(retried.headers.get('idempotent-replayed')).toBeNull();
    expect(await brandCount('rolled')).toBe(1);
  });
});

describe('deferred authorization', () => {
  it('blocks a missing approval with approval_required', async () => {
    const response = await post('probe-schedule', { slug: 'unapproved', mode: 'missing' });
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('approval_required');
    expect(await brandCount('unapproved')).toBe(0);
  });

  it('rolls back a handler that writes without settling the decision', async () => {
    expect((await post('probe-schedule', { slug: 'skipped', mode: 'skip' })).status).toBe(500);
    expect(await brandCount('skipped')).toBe(0);
  });

  it('allows the write once the handler authorizes with an approval', async () => {
    expect((await post('probe-schedule', { slug: 'approved', mode: 'approved' })).status).toBe(200);
    expect(await brandCount('approved')).toBe(1);
  });
});
