import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, TEST_NOW, testBaseContext } from '../_kit/testing.ts';
import { xRuntime } from './runtime.ts';
import {
  APP,
  connect,
  form,
  REDIRECT,
  REFRESH,
  REVOKE_URL,
  TOKEN,
  TOKEN_URL,
  USER_ID,
  withToken,
} from './testing.ts';

const SCOPE = 'tweet.read tweet.write users.read media.write offline.access';
const ME = 'https://api.x.com/2/users/me';
const BASIC = `Basic ${Buffer.from(`${APP.clientId}:${APP.clientSecret}`).toString('base64')}`;

const token = (extra: Record<string, unknown> = {}): ScriptedExchange => ({
  method: 'POST',
  url: TOKEN_URL,
  json: {
    token_type: 'bearer',
    access_token: 'x-access-1',
    refresh_token: 'x-refresh-1',
    expires_in: 7200,
    scope: SCOPE,
    ...extra,
  },
});

const me = (data: Record<string, unknown> = {}): ScriptedExchange => ({
  url: ME,
  json: { data: { id: USER_ID, username: 'ada_dev', name: 'Ada Lovelace', ...data } },
});

describe('x connect', () => {
  it('sends a PKCE S256 consent URL with every scope', async () => {
    const { authorizationUrl, pending } = await xRuntime.connectStart(
      testBaseContext(scriptedHttp([])),
      { app: APP, redirectUri: REDIRECT, state: 'state-1' },
    );
    const url = new URL(authorizationUrl);
    const verifier = String(pending.verifier);
    expect(`${url.origin}${url.pathname}`).toBe('https://x.com/i/oauth2/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: APP.clientId,
      redirect_uri: REDIRECT,
      scope: SCOPE,
      state: 'state-1',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    });
  });

  it('exchanges the code with Basic auth and the verifier, then reads the user', async () => {
    const { result, calls } = await connect([token(), me()]);
    expect(calls[0]?.headers).toEqual({
      Authorization: BASIC,
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    expect(form(calls[0]?.body)).toEqual({
      grant_type: 'authorization_code',
      code: 'code-1',
      redirect_uri: REDIRECT,
      code_verifier: 'v'.repeat(43),
    });
    expect(calls[1]?.headers).toEqual({ Authorization: 'Bearer x-access-1' });
    expect(result).toEqual([
      {
        credentials: { accessToken: 'x-access-1', refreshToken: 'x-refresh-1' },
        grantedScopes: SCOPE.split(' '),
        accessExpiresAt: TEST_NOW.add({ seconds: 7200 }),
        providerAccountId: USER_ID,
        accountKind: 'account',
        handle: 'ada_dev',
        displayName: 'Ada Lovelace',
        profileUrl: 'https://x.com/ada_dev',
        subjectId: USER_ID,
      },
    ]);
  });

  it('fails the connect when a scope is missing', async () => {
    const { error } = await connect([token({ scope: 'tweet.read tweet.write users.read' })]);
    expect(error).toEqual({ kind: 'permanent', code: 'scope_missing' });
  });

  it('needs the PKCE verifier and a refresh token', async () => {
    expect((await connect([], {})).error).toEqual({ kind: 'permanent', code: 'pending_invalid' });
    const { error } = await connect([token({ refresh_token: undefined })]);
    expect(error).toEqual({ kind: 'permanent', code: 'refresh_token_missing' });
  });

  it('treats only a rejected client as an app problem', async () => {
    const rejected = { method: 'POST', url: TOKEN_URL, status: 401 };
    const client = await connect([{ ...rejected, json: { error: 'invalid_client' } }]);
    expect(client.error).toEqual({ kind: 'app_config', code: 'client_invalid' });
    const other = await connect([rejected]);
    expect(other.error).toEqual({
      kind: 'permanent',
      code: 'code_exchange_failed',
      detail: 'http_401',
    });
  });
});

describe('x tokens', () => {
  it('stores the rotated refresh token', async () => {
    const { result, calls } = await withToken('refresh', [token({ refresh_token: 'x-refresh-2' })]);
    expect(form(calls[0]?.body)).toEqual({ grant_type: 'refresh_token', refresh_token: REFRESH });
    expect(calls[0]?.headers.Authorization).toBe(BASIC);
    expect(result).toEqual({
      credentials: { accessToken: 'x-access-1', refreshToken: 'x-refresh-2' },
      grantedScopes: SCOPE.split(' '),
      accessExpiresAt: TEST_NOW.add({ seconds: 7200 }),
    });
  });

  it('keeps the old refresh token when none comes back, and maps a rejected grant', async () => {
    const kept = await withToken('refresh', [token({ refresh_token: undefined })]);
    expect(kept.result).toMatchObject({ credentials: { refreshToken: REFRESH } });
    const revoked = await withToken('refresh', [{ method: 'POST', url: TOKEN_URL, status: 400 }]);
    expect(revoked.error).toEqual({ kind: 'auth_revoked' });
  });

  it('keeps a refresh without credits on the channel, not the app', async () => {
    const { error } = await withToken('refresh', [{ method: 'POST', url: TOKEN_URL, status: 402 }]);
    expect(error).toEqual({ kind: 'permanent', code: 'credits_depleted', detail: 'http_402' });
  });

  it('revokes the refresh token, then the access token', async () => {
    const ok = { method: 'POST', url: REVOKE_URL, json: { revoked: true } };
    const { error, calls } = await withToken('revoke', [ok, ok]);
    expect(error).toBeUndefined();
    expect(calls.map((call) => form(call.body))).toEqual([{ token: REFRESH }, { token: TOKEN }]);
    expect(calls[0]?.headers.Authorization).toBe(BASIC);
  });

  it('still revokes the access token when the refresh token is rejected', async () => {
    const rejected = { method: 'POST', url: REVOKE_URL, status: 400 };
    const ok = { method: 'POST', url: REVOKE_URL, json: { revoked: true } };
    const { error, calls } = await withToken('revoke', [rejected, ok]);
    expect(calls.map((call) => form(call.body))).toEqual([{ token: REFRESH }, { token: TOKEN }]);
    expect(error).toEqual({ kind: 'permanent', code: 'revoke_rejected', detail: 'http_400' });
  });
});
