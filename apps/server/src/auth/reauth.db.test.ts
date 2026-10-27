import { randomBytes } from 'node:crypto';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { pino } from 'pino';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  addMember,
  decideCall,
  decided,
  type Member,
  openRequestOf,
  reauthenticatedHoursAgo,
  requested,
  setPolicy,
} from '../approvals/testing.ts';
import {
  type Auth,
  app,
  BASE,
  CLI,
  create,
  draft,
  errorOf,
  owner,
  ownerAuth,
  PASSWORD,
  SYSTEM,
  startPosts,
  stopPosts,
} from '../posts/testing.ts';
import { REAUTH_MAX_FAILURES } from './reauth.ts';

const WRONG = 'not the right password';
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

beforeEach(async () => {
  await setPolicy({ mode: 'required', required_approvals: 1, allow_self_approval: false });
});

function cookieOf(auth: Auth): string {
  if (!('cookie' in auth)) throw new Error('not a session');
  return auth.cookie;
}

async function reauthenticate(auth: Auth, password: string): Promise<Response> {
  return await app.request(`${BASE}/v1/auth/reauthenticate`, {
    method: 'POST',
    headers: { cookie: cookieOf(auth), origin: BASE, 'content-type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}

function sessionOf(userId: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('sessions')
      .select(['id', 'reauthenticated_at'])
      .where('user_id', '=', userId)
      .executeTakeFirst(),
  );
}

function eventsOf(userId: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('security_events')
      .select(['kind', 'detail'])
      .where('user_id', '=', userId)
      .where('kind', 'like', 'auth.reauth%')
      .orderBy('occurred_at')
      .orderBy('id')
      .execute(),
  );
}

async function staleMember(label: string): Promise<Member> {
  const member = await addMember(label, true);
  await reauthenticatedHoursAgo(member.id, 13);
  return member;
}

describe('reauthenticating', () => {
  it('refreshes the session with the right password and keeps the cookie', async () => {
    const member = await staleMember('fresh');
    const before = await sessionOf(member.id);
    const response = await reauthenticate(member.auth, PASSWORD);
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([]);
    const { reauthenticatedAt } = (await response.json()) as { reauthenticatedAt: string };
    const after = await sessionOf(member.id);
    expect(after?.id).toBe(before?.id);
    expect(after?.reauthenticated_at.toISOString()).toBe(reauthenticatedAt);
    expect(Date.now() - Date.parse(reauthenticatedAt)).toBeLessThan(60_000);
    expect(await eventsOf(member.id)).toEqual([
      { kind: 'auth.reauthenticated', detail: { method: 'password' } },
    ]);
  });

  it('lets a decision that needed reauthentication through afterwards', async () => {
    const member = await staleMember('approver');
    const request = await openRequestOf(await requested(await create(ownerAuth, draft())));
    const refused = await decideCall(request, 'approve', member.auth);
    expect(refused.status).toBe(403);
    expect((await errorOf(refused)).message).toMatch(/^Reauthentication required/);

    expect((await reauthenticate(member.auth, PASSWORD)).status).toBe(200);
    expect(await decided(request, 'approve', member.auth)).toMatchObject({ state: 'approved' });
  });

  it('refuses a wrong password and records the failure', async () => {
    const member = await staleMember('wrong');
    const session = await sessionOf(member.id);
    const response = await reauthenticate(member.auth, WRONG);
    expect(response.status).toBe(401);
    expect(await errorOf(response)).toMatchObject({
      code: 'unauthenticated',
      message: 'The password is incorrect.',
    });
    expect(await eventsOf(member.id)).toEqual([
      {
        kind: 'auth.reauth_failed',
        detail: { session: session?.id, reason: 'invalid_credentials' },
      },
    ]);
    expect((await sessionOf(member.id))?.reauthenticated_at).toEqual(session?.reauthenticated_at);
  });

  it('revokes the session on the fifth failure since the last reauthentication', async () => {
    const member = await staleMember('guessed');
    for (let i = 1; i < REAUTH_MAX_FAILURES; i++) {
      expect((await reauthenticate(member.auth, WRONG)).status).toBe(401);
    }
    expect((await reauthenticate(member.auth, PASSWORD)).status).toBe(200);
    for (let i = 1; i < REAUTH_MAX_FAILURES; i++) {
      expect((await reauthenticate(member.auth, WRONG)).status).toBe(401);
    }
    expect(await sessionOf(member.id)).toBeDefined();

    const last = await reauthenticate(member.auth, WRONG);
    expect(last.status).toBe(401);
    expect((await errorOf(last)).message).toBe('Too many incorrect passwords: sign in again.');
    expect(await sessionOf(member.id)).toBeUndefined();
    const next = await app.request(`${BASE}/v1/me`, { headers: { cookie: cookieOf(member.auth) } });
    expect(next.status).toBe(401);
  });

  it('refuses an account with two-factor sign-in', async () => {
    const member = await staleMember('totp');
    await owner.withActor(CLI, (trx) =>
      trx
        .updateTable('users')
        .set({
          totp_secret_ciphertext: randomBytes(32),
          totp_nonce: randomBytes(12),
          totp_wrapped_dek: randomBytes(40),
          totp_kek_version: 1,
        })
        .where('id', '=', member.id)
        .execute(),
    );
    const response = await reauthenticate(member.auth, PASSWORD);
    expect(response.status).toBe(401);
    expect((await errorOf(response)).code).toBe('unauthenticated');
    expect((await eventsOf(member.id)).map((e) => e.detail)).toEqual([
      expect.objectContaining({ reason: 'two_factor_unavailable' }),
    ]);
  });

  it('never logs the password', () => {
    const logged = lines.join('\n');
    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toContain(WRONG);
  });
});
