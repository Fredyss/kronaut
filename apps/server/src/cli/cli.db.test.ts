import { randomBytes, randomUUID } from 'node:crypto';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { Hono } from 'hono';
import { type RawBuilder, sql } from 'kysely';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authRoutes } from '../auth/routes.ts';
import { createHttpApp, deriveHttpKeys } from '../http/kernel.ts';
import { release, restoreComplete } from './instance.ts';
import { createOwner, resetPassword, type UserCommandDeps } from './users.ts';

const SYSTEM: Actor = { kind: 'system' };
const NOW = Temporal.Instant.from('2026-10-21T12:00:00Z');
const BASE = 'https://kronaut.example.test';
const PASSWORD = 'a long enough password';

let test: TestDatabase;
let owner: Database;
let db: Database;
let operator: Database;
let app: Hono;
let deps: UserCommandDeps;
const logLines: string[] = [];

beforeAll(async () => {
  test = await startTestDatabase();
  owner = createDatabase({ connectionString: test.ownerUrl });
  db = createDatabase({ connectionString: test.appUrl });
  operator = createDatabase({ connectionString: test.operatorUrl });
  const keys = deriveHttpKeys(randomBytes(32));
  const logger = pino({ base: null }, { write: (line: string) => logLines.push(line) });
  deps = { db, resetKey: keys.reset, publicUrl: new URL(BASE), now: NOW, logger };
  const httpDeps = {
    db,
    keys,
    logger: pino({ level: 'silent' }),
    clock: () => NOW,
    publicBaseUrl: BASE,
    readiness: async () => true,
  };
  app = createHttpApp(httpDeps, authRoutes(httpDeps));
});

afterAll(async () => {
  await owner?.destroy();
  await db?.destroy();
  await operator?.destroy();
  await test?.stop();
});

function tokenOf(link: string): string {
  const url = new URL(link);
  expect(`${url.origin}${url.pathname}`).toBe(`${BASE}/reset-password`);
  return url.hash.slice('#token='.length);
}

async function setPassword(token: string, password: string): Promise<Response> {
  return await app.request(`${BASE}/v1/auth/password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
}

async function login(email: string, password: string): Promise<Response> {
  return await app.request(`${BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

async function ownerRows<T>(query: RawBuilder<T>): Promise<T[]> {
  return await owner.withActor(SYSTEM, async (trx) => (await query.execute(trx)).rows);
}

const issuedTokens: string[] = [];

describe('owner CLI', () => {
  it('creates an owner whose link sets the first password', async () => {
    const created = await createOwner(deps, {
      email: 'Owner@Example.test',
      name: 'Owner',
      workspace: 'Žltá Kancelária',
      timezone: 'europe/bratislava',
    });
    const [user] = await ownerRows(
      sql<{ password_hash: string | null; email_normalized: string }>`
        select password_hash, email_normalized from users where id = ${created.userId}`,
    );
    expect(user).toEqual({ password_hash: null, email_normalized: 'owner@example.test' });
    const workspaces = await ownerRows(
      sql<{ id: string; slug: string; timezone: string; role: string }>`
        select w.id, w.slug, w.timezone, m.role from memberships m
          join workspaces w on w.id = m.workspace_id where m.user_id = ${created.userId}`,
    );
    expect(workspaces).toEqual([
      {
        id: created.workspaceId,
        slug: 'zlta-kancelaria',
        timezone: 'Europe/Bratislava',
        role: 'owner',
      },
    ]);
    const events = await ownerRows(
      sql<{ detail: unknown }>`
        select detail from security_events
         where kind = 'cli.user_created' and user_id = ${created.userId}`,
    );
    expect(events).toEqual([{ detail: { workspace_id: created.workspaceId } }]);

    const token = tokenOf(created.link);
    issuedTokens.push(token);
    expect((await setPassword(token, PASSWORD)).status).toBe(204);
    expect((await login('owner@example.test', PASSWORD)).status).toBe(200);
    await expect(
      createOwner(deps, {
        email: 'owner@example.test',
        name: 'Again',
        workspace: 'Other',
        timezone: 'UTC',
      }),
    ).rejects.toThrow('already exists');
  });

  it('revokes sessions on reset-password and the link replaces the password', async () => {
    const created = await createOwner(deps, {
      email: 'reset@example.test',
      name: 'Reset',
      workspace: 'Reset space',
      timezone: 'Europe/Prague',
    });
    expect((await setPassword(tokenOf(created.link), PASSWORD)).status).toBe(204);
    expect((await login('reset@example.test', PASSWORD)).status).toBe(200);
    const sessions = sql<{ n: number }>`
      select count(*)::int as n from sessions where user_id = ${created.userId}`;
    expect(await ownerRows(sessions)).toEqual([{ n: 1 }]);

    const issued = await resetPassword(deps, ' RESET@example.test ');
    expect(await ownerRows(sessions)).toEqual([{ n: 0 }]);
    const token = tokenOf(issued.link);
    issuedTokens.push(token);
    expect((await setPassword(token, 'a brand new password')).status).toBe(204);
    expect((await login('reset@example.test', PASSWORD)).status).toBe(401);
    expect((await login('reset@example.test', 'a brand new password')).status).toBe(200);
    await expect(resetPassword(deps, 'nobody@example.test')).rejects.toThrow(
      'no active user has this email',
    );
  });

  it('marks a restore complete and releases the instance', async () => {
    await db.withActor(SYSTEM, (trx) =>
      sql`select instance_fence(${randomUUID()}::uuid)`.execute(trx),
    );
    const state = sql<{
      instance_id: string;
      restore_epoch: number;
      publishing_paused: boolean;
      paused_reason: string | null;
    }>`
      select instance_id, restore_epoch, publishing_paused, paused_reason from instance_state`;
    const [before] = await ownerRows(state);

    const epoch = await restoreComplete({ db: operator, logger: deps.logger });
    expect(epoch).toBe((before?.restore_epoch ?? 0) + 1);
    const [restored] = await ownerRows(state);
    expect(restored).toMatchObject({
      restore_epoch: epoch,
      publishing_paused: true,
      paused_reason: 'restore_quarantine',
    });

    const instanceId = randomUUID();
    await release({ db: operator, logger: deps.logger }, instanceId);
    expect(await ownerRows(state)).toEqual([
      {
        instance_id: instanceId,
        restore_epoch: epoch,
        publishing_paused: false,
        paused_reason: null,
      },
    ]);
  });

  it('never writes a token into security events or the log', async () => {
    expect(issuedTokens.length).toBe(2);
    expect(logLines.length).toBeGreaterThan(0);
    const events = await ownerRows(
      sql<{ kind: string; detail: string | null }>`
        select kind, detail::text as detail from security_events`,
    );
    expect(events.map((e) => e.kind)).toEqual(
      expect.arrayContaining([
        'cli.user_created',
        'cli.password_reset_issued',
        'user.password_reset',
      ]),
    );
    const haystacks = [...events.map((e) => e.detail ?? ''), ...logLines];
    for (const token of issuedTokens) {
      const body = token.slice('kro_rst_'.length);
      for (const haystack of haystacks) {
        expect(haystack).not.toContain(body);
        expect(haystack).not.toContain(body.slice(0, 32));
      }
    }
  });
});
