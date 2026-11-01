import { randomBytes } from 'node:crypto';
import { encodePublicId } from '@kronaut/core';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHttpApp, deriveHttpKeys } from '../http/kernel.ts';
import { hashPassword } from './password.ts';
import { issueResetToken } from './reset-token.ts';
import { authRoutes } from './routes.ts';
import { SESSION_COOKIE } from './session.ts';

const SYSTEM: Actor = { kind: 'system' };
const NOW = Temporal.Now.instant();
const BASE = 'https://kronaut.example.test';
const EMAIL = 'self@example.test';
const PASSWORD = 'correct horse battery';

let test: TestDatabase;
let db: Database;
let app: Hono;
let resetKey: Uint8Array;
let userId: string;
let workspaceId: string;

beforeAll(async () => {
  test = await startTestDatabase();
  db = createDatabase({ connectionString: test.appUrl });
  const hash = await hashPassword(PASSWORD);
  userId = await db.withActor(SYSTEM, async (trx) => {
    const result = await sql<{ id: string }>`
      select auth_create_user(${EMAIL}, ${EMAIL}, 'Self', ${hash}, 'en') as id
    `.execute(trx);
    return result.rows[0]?.id ?? '';
  });
  workspaceId = await db.withActor({ kind: 'user', id: userId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id
        from provision_organization('Org Self', 'Workspace Self', 'ws-self', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  const deps = {
    db,
    keys: deriveHttpKeys(randomBytes(32)),
    logger: pino({ level: 'silent' }),
    clock: () => NOW,
    publicBaseUrl: BASE,
    readiness: async () => true,
  };
  resetKey = deps.keys.reset;
  app = createHttpApp(deps, authRoutes(deps));
});

afterAll(async () => {
  await db?.destroy();
  await test?.stop();
});

function sessionCookie(response: Response): string {
  const header = response.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (header === undefined) throw new Error('no session cookie');
  return header.split(';')[0] ?? '';
}

async function login(password = PASSWORD): Promise<Response> {
  return await app.request(`${BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ` ${EMAIL.toUpperCase()} `, password }),
  });
}

describe('session self routes', () => {
  it('signs in, reads the account and signs out', async () => {
    const signedIn = await login();
    expect(signedIn.status).toBe(200);
    expect(await signedIn.json()).toEqual({ userId: encodePublicId('user', userId) });
    const cookie = sessionCookie(signedIn);

    const me = await app.request(`${BASE}/v1/me`, { headers: { cookie } });
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({
      user: { id: encodePublicId('user', userId), displayName: 'Self', email: EMAIL, locale: 'en' },
      instanceAdmin: false,
      workspaces: [
        {
          id: encodePublicId('workspace', workspaceId),
          name: 'Workspace Self',
          role: 'owner',
          canApprove: true,
        },
      ],
    });
    await db.withTenant(workspaceId, SYSTEM, (trx) =>
      trx
        .updateTable('memberships')
        .set({ can_approve: false })
        .where('user_id', '=', userId)
        .execute(),
    );
    const notApprover = await app.request(`${BASE}/v1/me`, { headers: { cookie } });
    expect(await notApprover.json()).toMatchObject({ workspaces: [{ canApprove: false }] });

    const crossSite = await app.request(`${BASE}/v1/auth/logout`, {
      method: 'POST',
      headers: { cookie, origin: 'https://evil.example.test' },
    });
    expect(crossSite.status).toBe(403);

    const out = await app.request(`${BASE}/v1/auth/logout`, {
      method: 'POST',
      headers: { cookie, origin: BASE },
    });
    expect(out.status).toBe(204);
    expect(out.headers.getSetCookie().some((c) => c.includes('Max-Age=0'))).toBe(true);

    const after = await app.request(`${BASE}/v1/me`, { headers: { cookie } });
    expect(after.status).toBe(401);
  });

  it('rejects a wrong password and a bearer token on self routes', async () => {
    expect((await login('wrong password here')).status).toBe(401);
    const bearer = await app.request(`${BASE}/v1/me`, {
      headers: { authorization: 'Bearer kr_not_a_session' },
    });
    expect(bearer.status).toBe(401);
  });
});

const RESET_REJECTED = { code: 'invalid_request', message: 'The link is invalid or has expired.' };
const NEW_PASSWORD = 'a fresh password here';

async function createResetUser(label: string): Promise<{ id: string; hash: string }> {
  const hash = await hashPassword(PASSWORD);
  const id = await db.withActor(SYSTEM, async (trx) => {
    const email = `${label}@example.test`;
    const result = await sql<{ id: string }>`
      select auth_create_user(${email}, ${email}, ${label}, ${hash}, 'en') as id
    `.execute(trx);
    return result.rows[0]?.id ?? '';
  });
  return { id, hash };
}

async function postReset(token: string, password = NEW_PASSWORD): Promise<Response> {
  return await app.request(`${BASE}/v1/auth/password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
}

async function rejection(response: Response): Promise<unknown> {
  expect(response.status).toBe(400);
  const { error } = (await response.json()) as { error: Record<string, unknown> };
  return { code: error.code, message: error.message };
}

describe('password reset link', () => {
  it('works only once', async () => {
    const user = await createResetUser('once');
    const token = issueResetToken(resetKey, { userId: user.id, passwordHash: user.hash, now: NOW });
    expect((await postReset(token)).status).toBe(204);
    expect(await rejection(await postReset(token, 'yet another password'))).toEqual(RESET_REJECTED);
  });

  it('dies when a later link changes the password', async () => {
    const user = await createResetUser('older');
    const first = issueResetToken(resetKey, {
      userId: user.id,
      passwordHash: user.hash,
      now: NOW.subtract({ minutes: 2 }),
    });
    const second = issueResetToken(resetKey, {
      userId: user.id,
      passwordHash: user.hash,
      now: NOW.subtract({ minutes: 1 }),
    });
    expect(first).not.toBe(second);
    expect((await postReset(second)).status).toBe(204);
    expect(await rejection(await postReset(first, 'yet another password'))).toEqual(RESET_REJECTED);
  });

  it('rejects an expired link with the same body', async () => {
    const user = await createResetUser('expired');
    const token = issueResetToken(resetKey, {
      userId: user.id,
      passwordHash: user.hash,
      now: NOW.subtract({ minutes: 16 }),
    });
    expect(await rejection(await postReset(token))).toEqual(RESET_REJECTED);
  });

  it('keeps the link usable after a weak password is refused', async () => {
    const user = await createResetUser('weak');
    const token = issueResetToken(resetKey, { userId: user.id, passwordHash: user.hash, now: NOW });
    const weak = await postReset(token, 'short');
    expect(weak.status).toBe(422);
    const body = (await weak.json()) as { error: { code: string; details: unknown } };
    expect(body.error.code).toBe('unprocessable');
    expect(body.error.details).toEqual([{ path: 'password', code: 'too_short' }]);
    expect((await postReset(token)).status).toBe(204);
  });
});
