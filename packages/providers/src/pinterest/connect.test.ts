import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, TEST_NOW, testBaseContext } from '../_kit/testing.ts';
import { pinterestManifest } from './manifest.ts';
import { pinterestRuntime } from './runtime.ts';
import { APP, connect, REDIRECT, refresh, TOKEN_URL } from './testing.ts';

const SCOPE = 'boards:read boards:write pins:read pins:write user_accounts:read';
const USER = 'https://api.pinterest.com/v5/user_account';
const BOARDS = 'https://api.pinterest.com/v5/boards?privacy=PUBLIC&page_size=250';

const token = (extra: Record<string, unknown> = {}): ScriptedExchange => ({
  method: 'POST',
  url: TOKEN_URL,
  json: {
    access_token: 'pina-access-1',
    refresh_token: 'pinr-refresh-1',
    response_type: 'authorization_code',
    token_type: 'bearer',
    expires_in: 2_592_000,
    refresh_token_expires_in: 5_184_000,
    scope: SCOPE,
    ...extra,
  },
});

const user = (extra: Record<string, unknown> = {}): ScriptedExchange => ({
  url: USER,
  json: { id: '1100000000000001', username: 'ada_makes', business_name: 'Ada Studio', ...extra },
});

function boards(names: readonly string[], from = 0, bookmark: string | null = null) {
  const items = names.map((name, index) => ({ id: String(9000 + from + index), name }));
  return { items, bookmark };
}

function form(body: unknown): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(String(body)));
}

describe('pinterest connect', () => {
  it('sends the consent URL with every scope and no PKCE', async () => {
    const { authorizationUrl, pending } = await pinterestRuntime.connectStart(
      testBaseContext(scriptedHttp([])),
      { app: APP, redirectUri: REDIRECT, state: 'state-1' },
    );
    const url = new URL(authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe('https://www.pinterest.com/oauth/');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: APP.clientId,
      redirect_uri: REDIRECT,
      response_type: 'code',
      scope: 'boards:read,boards:write,pins:read,pins:write,user_accounts:read',
      state: 'state-1',
    });
    expect(pending).toEqual({});
  });

  it('exchanges the code with Basic auth and returns one account with its public boards', async () => {
    const { result, calls } = await connect([
      token(),
      user(),
      { url: BOARDS, json: boards(['Recipes', 'Garden', 'garden tools']) },
    ]);
    const basic = Buffer.from(`${APP.clientId}:${APP.clientSecret}`).toString('base64');
    expect(calls[0]?.headers).toEqual({
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    expect(form(calls[0]?.body)).toEqual({
      grant_type: 'authorization_code',
      code: 'code-1',
      redirect_uri: REDIRECT,
      continuous_refresh: 'true',
    });
    expect(calls[1]?.headers).toEqual({ Authorization: 'Bearer pina-access-1' });
    expect(result).toEqual([
      {
        credentials: { accessToken: 'pina-access-1', refreshToken: 'pinr-refresh-1' },
        grantedScopes: SCOPE.split(' '),
        accessExpiresAt: TEST_NOW.add({ seconds: 2_592_000 }),
        refreshExpiresAt: TEST_NOW.add({ seconds: 5_184_000 }),
        providerAccountId: '1100000000000001',
        accountKind: 'account',
        displayName: 'Ada Studio',
        handle: 'ada_makes',
        subjectId: '1100000000000001',
        profileUrl: 'https://www.pinterest.com/ada_makes/',
        capabilities: {
          boards: [
            { id: '9001', name: 'Garden' },
            { id: '9002', name: 'garden tools' },
            { id: '9000', name: 'Recipes' },
          ],
        },
      },
    ]);
  });

  it('pages through the boards and stops at 500', async () => {
    const page = (from: number, bookmark: string | null) => {
      const names = Array.from({ length: 250 }, (_, index) => `Board ${from + index}`);
      return boards(names, from, bookmark);
    };
    const { result, calls } = await connect([
      token(),
      user({ business_name: null }),
      { url: BOARDS, json: page(0, 'b1') },
      { url: `${BOARDS}&bookmark=b1`, json: page(250, 'b2') },
    ]);
    expect(calls).toHaveLength(4);
    const [account] = result ?? [];
    expect(account?.displayName).toBe('ada_makes');
    const stored = account?.capabilities?.boards as readonly { name: string }[];
    expect(stored).toHaveLength(500);
    expect(stored[0]?.name).toBe('Board 0');
  });

  it('connects an account without public boards', async () => {
    const { result } = await connect([token(), user(), { url: BOARDS, json: boards([]) }]);
    expect(result?.[0]?.capabilities).toEqual({ boards: [] });
  });

  it.each([
    ['a missing write scope', token({ scope: 'boards:read,pins:read,user_accounts:read' })],
    ['no scope', token({ scope: undefined })],
  ])('fails the connect with %s', async (_name, exchange) => {
    const { error, calls } = await connect([exchange]);
    expect(error).toEqual({ kind: 'permanent', code: 'scope_missing' });
    expect(calls).toHaveLength(1);
  });

  it('reports a pinner without data access as needing a business account', async () => {
    const denied = { code: 403, message: 'PINNER_DATA_ACCESS_DENIED' };
    const { error } = await connect([token(), user(), { url: BOARDS, status: 403, json: denied }]);
    expect(error).toMatchObject({ kind: 'permanent', code: 'business_account_required' });
  });

  it('refuses a denied consent and a rejected client', async () => {
    expect((await connect([], { error: 'access_denied' })).error).toEqual({
      kind: 'permanent',
      code: 'authorization_denied',
    });
    const rejected = { method: 'POST', url: TOKEN_URL, status: 401, json: { code: 1 } };
    expect((await connect([rejected])).error).toEqual({
      kind: 'app_config',
      code: 'client_invalid',
    });
  });
});

describe('pinterest board options', () => {
  const options = pinterestManifest.accountSettingOptions;

  it('lists the stored boards as board choices', () => {
    expect(options?.({ boards: [{ id: '9001', name: 'Garden' }] })).toEqual({
      boardId: [{ value: '9001', label: 'Garden' }],
    });
  });

  it.each([null, {}, { boards: [{ id: 'x', name: 'Bad' }] }, 'boards'])(
    'gives no options for unparsable capabilities %j',
    (capabilities) => {
      expect(options?.(capabilities)).toEqual({});
    },
  );
});

describe('pinterest refresh', () => {
  it('stores the rotated refresh token and its new expiry', async () => {
    const { result, calls } = await refresh({
      method: 'POST',
      url: TOKEN_URL,
      json: {
        access_token: 'pina-access-2',
        refresh_token: 'pinr-refresh-2',
        response_type: 'refresh_token',
        expires_in: 2_592_000,
        refresh_token_expires_in: 5_184_000,
        refresh_token_expires_at: 1_766_000_000,
        scope: SCOPE,
      },
    });
    expect(result).toEqual({
      credentials: { accessToken: 'pina-access-2', refreshToken: 'pinr-refresh-2' },
      grantedScopes: SCOPE.split(' '),
      accessExpiresAt: TEST_NOW.add({ seconds: 2_592_000 }),
      refreshExpiresAt: TEST_NOW.add({ seconds: 5_184_000 }),
    });
    expect(form(calls[0]?.body)).toEqual({
      grant_type: 'refresh_token',
      refresh_token: 'pinr-refresh-canary-a71c',
    });
    expect(calls[0]?.headers.Authorization).toMatch(/^Basic /);
    expect(JSON.stringify(calls)).not.toContain('pina-access-canary');
  });

  it.each([
    [400, { kind: 'auth_revoked' }],
    [401, { kind: 'app_config', code: 'client_invalid' }],
    [503, { kind: 'transient', detail: 'http_503' }],
  ])('maps a %i refresh to %j', async (status, expected) => {
    const { error } = await refresh({ method: 'POST', url: TOKEN_URL, status, json: { code: 2 } });
    expect(error).toEqual(expected);
  });
});
