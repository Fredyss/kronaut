import { encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type Auth,
  app,
  BASE,
  createUser,
  errorOf,
  grantAuth,
  login,
  owner,
  SYSTEM,
  startPosts,
  stopPosts,
} from '../posts/testing.ts';
import { DISPLAY_NAME_MAX_LENGTH } from './profile.ts';

let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

const NAME = 'Zuzana Nov\u00e1kov\u00e1';

interface Member {
  readonly id: string;
  readonly auth: Auth;
}

async function member(label: string): Promise<Member> {
  const id = await createUser(label);
  return { id, auth: await login(label) };
}

function headersOf(auth: Auth): Record<string, string> {
  return 'cookie' in auth
    ? { cookie: auth.cookie, origin: BASE }
    : { authorization: `Bearer ${auth.bearer}` };
}

async function patchMe(auth: Auth, body: unknown): Promise<Response> {
  return await app.request(`${BASE}/v1/me`, {
    method: 'PATCH',
    headers: { ...headersOf(auth), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function me(auth: Auth) {
  const response = await app.request(`${BASE}/v1/me`, { headers: headersOf(auth) });
  expect(response.status).toBe(200);
  return ((await response.json()) as { user: unknown }).user;
}

function rowOf(userId: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('users')
      .select(['display_name', 'ui_locale'])
      .where('id', '=', userId)
      .executeTakeFirstOrThrow(),
  );
}

describe('PATCH /v1/me', () => {
  it('changes the name and the language and GET /v1/me reflects them', async () => {
    const { id, auth } = await member('renamed');
    const response = await patchMe(auth, {
      displayName: '  Zuzana Nova\u0301kova\u0301 ',
      locale: 'sk',
    });
    expect(response.status).toBe(200);
    const expected = {
      id: encodePublicId('user', id),
      displayName: NAME,
      email: 'renamed@example.test',
      locale: 'sk',
    };
    expect(await response.json()).toEqual({ user: expected });
    expect(await me(auth)).toEqual(expected);
    expect(await rowOf(id)).toEqual({ display_name: NAME, ui_locale: 'sk' });

    expect((await patchMe(auth, { locale: 'cs' })).status).toBe(200);
    expect(await me(auth)).toEqual({ ...expected, locale: 'cs' });
  });

  it('clears the name with null or an empty string', async () => {
    const { id, auth } = await member('cleared');
    expect((await patchMe(auth, { displayName: null })).status).toBe(200);
    expect(await rowOf(id)).toEqual({ display_name: null, ui_locale: 'en' });

    expect((await patchMe(auth, { displayName: 'Back' })).status).toBe(200);
    expect((await patchMe(auth, { displayName: '   ' })).status).toBe(200);
    expect(await me(auth)).toMatchObject({ displayName: null });
  });

  it('refuses an unknown locale, an empty body, an extra key and a long name', async () => {
    const { id, auth } = await member('refused');
    const bodies = [
      { locale: 'de' },
      {},
      { displayName: 'Ok', role: 'owner' },
      { displayName: 'x'.repeat(DISPLAY_NAME_MAX_LENGTH + 1) },
    ];
    for (const body of bodies) {
      const response = await patchMe(auth, body);
      expect(response.status, JSON.stringify(body)).toBe(400);
      expect((await errorOf(response)).code).toBe('invalid_request');
    }
    expect((await patchMe(auth, { displayName: 'x'.repeat(DISPLAY_NAME_MAX_LENGTH) })).status).toBe(
      200,
    );
    expect(await rowOf(id)).toMatchObject({ ui_locale: 'en' });
  });

  it("changes only the caller's row", async () => {
    const caller = await member('caller');
    const other = await member('bystander');
    expect((await patchMe(caller.auth, { displayName: 'Changed', locale: 'cs' })).status).toBe(200);
    expect(await rowOf(other.id)).toEqual({ display_name: 'bystander', ui_locale: 'en' });
    expect(await me(other.auth)).toMatchObject({ displayName: 'bystander', locale: 'en' });
  });

  it('refuses an API key', async () => {
    const response = await patchMe(grantAuth, { locale: 'sk' });
    expect(response.status).toBe(401);
  });
});
