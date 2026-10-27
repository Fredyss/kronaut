import { randomBytes } from 'node:crypto';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { pino } from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { reauthenticatedHoursAgo } from '../approvals/testing.ts';
import {
  type Auth,
  app,
  BASE,
  CLI,
  createUser,
  errorOf,
  login,
  owner,
  PASSWORD,
  SYSTEM,
  startPosts,
  stopPosts,
} from '../posts/testing.ts';
import { REAUTH_MAX_FAILURES } from './reauth.ts';
import { SESSION_COOKIE } from './session.ts';

const WRONG = 'not the right password';
const NEW_PASSWORD = 'a brand new passphrase';
const lines: string[] = [];

let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test, pino({ level: 'debug' }, { write: (line: string) => lines.push(line) }));
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

interface Member {
  readonly id: string;
  readonly auth: Auth;
}

async function member(label: string): Promise<Member> {
  const id = await createUser(label);
  return { id, auth: await login(label) };
}

function cookieOf(auth: Auth): string {
  if (!('cookie' in auth)) throw new Error('not a session');
  return auth.cookie;
}

async function post(auth: Auth, path: string, body: unknown): Promise<Response> {
  return await app.request(`${BASE}${path}`, {
    method: 'POST',
    headers: { cookie: cookieOf(auth), origin: BASE, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function changePassword(auth: Auth, currentPassword: string, newPassword = NEW_PASSWORD) {
  return post(auth, '/v1/auth/password/change', { currentPassword, newPassword });
}

async function signIn(label: string, password: string): Promise<Response> {
  return await app.request(`${BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: `${label}@example.test`, password }),
  });
}

async function meStatus(auth: Auth): Promise<number> {
  return (await app.request(`${BASE}/v1/me`, { headers: { cookie: cookieOf(auth) } })).status;
}

function sessionsOf(userId: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('sessions')
      .select(['id', 'reauthenticated_at'])
      .where('user_id', '=', userId)
      .orderBy('id')
      .execute(),
  );
}

function eventsOf(userId: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('security_events')
      .select(['kind', 'detail'])
      .where('user_id', '=', userId)
      .where('kind', 'in', ['auth.reauth_failed', 'user.password_changed'])
      .orderBy('occurred_at')
      .orderBy('id')
      .execute(),
  );
}

describe('POST /v1/auth/password/change', () => {
  it('sets the new password, keeps this session and revokes the others', async () => {
    const { id, auth } = await member('changer');
    const [current] = await sessionsOf(id);
    const other = await login('changer');
    await reauthenticatedHoursAgo(id, 13);
    expect(await sessionsOf(id)).toHaveLength(2);

    const response = await changePassword(auth, PASSWORD);
    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie()).toEqual([]);

    const left = await sessionsOf(id);
    expect(left).toHaveLength(1);
    expect(Date.now() - (left[0]?.reauthenticated_at.getTime() ?? 0)).toBeLessThan(60_000);
    expect(await meStatus(auth)).toBe(200);
    expect(await meStatus(other)).toBe(401);
    expect(left[0]?.id).toBe(current?.id);
    expect(await eventsOf(id)).toEqual([{ kind: 'user.password_changed', detail: {} }]);

    expect((await signIn('changer', PASSWORD)).status).toBe(401);
    const fresh = await signIn('changer', NEW_PASSWORD);
    expect(fresh.status).toBe(200);
    expect(fresh.headers.getSetCookie().some((c) => c.startsWith(`${SESSION_COOKIE}=`))).toBe(true);
  });

  it('refuses a wrong current password with 422 and keeps the session', async () => {
    const { id, auth } = await member('mistyped');
    const [session] = await sessionsOf(id);
    const response = await changePassword(auth, WRONG);
    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({
      code: 'unprocessable',
      details: [{ path: 'body.currentPassword', code: 'incorrect' }],
    });
    expect(await eventsOf(id)).toEqual([
      { kind: 'auth.reauth_failed', detail: { session: session?.id, reason: 'password_change' } },
    ]);
    expect(await meStatus(auth)).toBe(200);
    expect((await signIn('mistyped', PASSWORD)).status).toBe(200);
  });

  it('revokes the session on the fifth failure, counted with re-login failures', async () => {
    const { id, auth } = await member('guesser');
    for (let i = 1; i < REAUTH_MAX_FAILURES; i++) {
      const response =
        i % 2 === 0
          ? await post(auth, '/v1/auth/reauthenticate', { password: WRONG })
          : await changePassword(auth, WRONG);
      expect(response.status).toBe(i % 2 === 0 ? 401 : 422);
    }
    expect(await sessionsOf(id)).toHaveLength(1);
    expect(await meStatus(auth)).toBe(200);

    const last = await changePassword(auth, WRONG);
    expect(last.status).toBe(401);
    expect((await errorOf(last)).message).toBe('Too many incorrect passwords: sign in again.');
    expect(await sessionsOf(id)).toEqual([]);
    expect(await meStatus(auth)).toBe(401);
    expect((await signIn('guesser', PASSWORD)).status).toBe(200);
  });

  it('refuses a new password that fails the policy', async () => {
    const { id, auth } = await member('weak');
    const response = await changePassword(auth, PASSWORD, 'short');
    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({
      code: 'unprocessable',
      details: [{ path: 'body.newPassword', code: 'too_short' }],
    });
    expect(await eventsOf(id)).toEqual([]);
    expect((await signIn('weak', PASSWORD)).status).toBe(200);
  });

  it('refuses an account with two-factor sign-in', async () => {
    const { id, auth } = await member('second-factor');
    const [session] = await sessionsOf(id);
    await owner.withActor(CLI, (trx) =>
      trx
        .updateTable('users')
        .set({
          totp_secret_ciphertext: randomBytes(32),
          totp_nonce: randomBytes(12),
          totp_wrapped_dek: randomBytes(40),
          totp_kek_version: 1,
        })
        .where('id', '=', id)
        .execute(),
    );
    const response = await changePassword(auth, PASSWORD);
    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({
      code: 'unprocessable',
      details: [{ path: 'body.currentPassword', code: 'two_factor_unavailable' }],
    });
    expect(await eventsOf(id)).toEqual([
      {
        kind: 'auth.reauth_failed',
        detail: { session: session?.id, reason: 'two_factor_unavailable' },
      },
    ]);
    expect(await meStatus(auth)).toBe(200);
  });

  it('never logs a password', () => {
    const logged = lines.join('\n');
    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toContain(WRONG);
    expect(logged).not.toContain(NEW_PASSWORD);
  });
});
