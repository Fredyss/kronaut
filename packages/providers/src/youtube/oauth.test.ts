import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, TEST_NOW, testBaseContext } from '../_kit/testing.ts';
import { youtubeRuntime } from './runtime.ts';
import { input, REFRESH, TOKEN } from './testing.ts';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const { app, account, credentials } = input();

function form(body: unknown): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(String(body)));
}

async function refresh(exchange: ScriptedExchange) {
  const http = scriptedHttp([exchange]);
  if (youtubeRuntime.refresh === undefined) throw new Error('youtube refreshes tokens');
  const issued = youtubeRuntime.refresh(testBaseContext(http), { app, account, credentials });
  return { issued, http };
}

async function revoke(exchange: ScriptedExchange) {
  const http = scriptedHttp([exchange]);
  if (youtubeRuntime.revoke === undefined) throw new Error('youtube revokes tokens');
  const done = youtubeRuntime.revoke(testBaseContext(http), { app, account, credentials });
  return { done, http };
}

describe('youtube refresh', () => {
  it('trades the stored refresh token for a new access token and keeps the refresh token', async () => {
    const { issued, http } = await refresh({
      method: 'POST',
      url: TOKEN_URL,
      json: { access_token: 'access-2', expires_in: 3599, scope: 'a b' },
    });
    expect(await issued).toEqual({
      credentials: { accessToken: 'access-2', refreshToken: REFRESH },
      grantedScopes: ['a', 'b'],
      accessExpiresAt: TEST_NOW.add({ seconds: 3599 }),
    });
    expect(form(http.calls[0]?.body)).toEqual({
      grant_type: 'refresh_token',
      client_id: app.clientId,
      client_secret: 's',
      refresh_token: REFRESH,
    });
    expect(JSON.stringify(http.calls)).not.toContain(TOKEN);
  });

  it('takes a refresh token the response returns', async () => {
    const { issued } = await refresh({
      method: 'POST',
      url: TOKEN_URL,
      json: { access_token: 'access-2', expires_in: 3599, refresh_token: 'refresh-2' },
    });
    expect((await issued).credentials).toEqual({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    });
  });

  it.each([
    [400, { error: 'invalid_grant' }, { kind: 'auth_revoked' }],
    [503, {}, { kind: 'transient', detail: 'http_503' }],
    [429, {}, { kind: 'transient', detail: 'http_429' }],
    [400, { error: 'invalid_request' }, { kind: 'permanent', code: 'refresh_failed' }],
  ])('maps a %i refusal', async (status, json, error) => {
    const { issued } = await refresh({ method: 'POST', url: TOKEN_URL, status, json });
    await expect(issued).rejects.toMatchObject({ error });
  });
});

describe('youtube revoke', () => {
  it('posts the refresh token to the revoke endpoint', async () => {
    const { done, http } = await revoke({ method: 'POST', url: REVOKE_URL, json: {} });
    await expect(done).resolves.toBeUndefined();
    expect(form(http.calls[0]?.body)).toEqual({ token: REFRESH });
  });

  it('treats an already invalid token as revoked', async () => {
    const reply = {
      method: 'POST',
      url: REVOKE_URL,
      status: 400,
      json: { error: 'invalid_token' },
    };
    await expect((await revoke(reply)).done).resolves.toBeUndefined();
  });

  it.each([
    [400, { error: 'invalid_request' }],
    [503, {}],
  ])('treats a %i as transient', async (status, json) => {
    const { done } = await revoke({ method: 'POST', url: REVOKE_URL, status, json });
    await expect(done).rejects.toMatchObject({
      error: { kind: 'transient', detail: `http_${status}` },
    });
  });
});
