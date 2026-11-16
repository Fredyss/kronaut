import { createHash } from 'node:crypto';
import { isProviderFailure, type ProviderApp } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, TEST_NOW, testBaseContext } from '../_kit/testing.ts';
import { youtubeRuntime } from './runtime.ts';

const APP: ProviderApp = {
  clientId: '123456789012-abc.apps.googleusercontent.com',
  clientSecret: 'CANARY_google_client_secret',
  publicBaseUrl: 'https://k.example.org',
};
const REDIRECT = 'https://k.example.org/v1/oauth/youtube/callback';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHANNELS = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true';
const UPLOAD = 'https://www.googleapis.com/auth/youtube.upload';
const READONLY = 'https://www.googleapis.com/auth/youtube.readonly';
const VERIFIER = 'v'.repeat(43);

const token = (extra: Record<string, unknown> = {}): ScriptedExchange => ({
  method: 'POST',
  url: TOKEN_URL,
  json: {
    access_token: 'access-1',
    expires_in: 3599,
    refresh_token: 'refresh-1',
    scope: `${UPLOAD} ${READONLY}`,
    token_type: 'Bearer',
    ...extra,
  },
});

const channels = (items?: readonly unknown[]): ScriptedExchange => ({
  url: CHANNELS,
  json: items === undefined ? { kind: 'youtube#channelListResponse' } : { items },
});

async function finish(
  exchanges: readonly ScriptedExchange[],
  pending: unknown = { verifier: VERIFIER },
) {
  const http = scriptedHttp(exchanges);
  const outcome = await youtubeRuntime
    .connectFinish(testBaseContext(http), {
      app: APP,
      redirectUri: REDIRECT,
      pending: pending as Record<string, unknown>,
      params: { code: 'code-1', state: 's' },
    })
    .then(
      (accounts) => ({ accounts, error: undefined }),
      (error: unknown) => {
        if (isProviderFailure(error)) return { accounts: undefined, error: error.error };
        throw error;
      },
    );
  http.assertDone();
  return { ...outcome, calls: http.calls };
}

describe('youtube connect', () => {
  it('builds an offline consent URL with both scopes and an S256 challenge', async () => {
    const { authorizationUrl, pending } = await youtubeRuntime.connectStart(
      testBaseContext(scriptedHttp([])),
      { app: APP, redirectUri: REDIRECT, state: 'state-1' },
    );
    const url = new URL(authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    const verifier = String((pending as { verifier?: unknown }).verifier);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: APP.clientId,
      redirect_uri: REDIRECT,
      state: 'state-1',
      scope: `openid ${UPLOAD} ${READONLY}`,
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    });
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('refuses to start without a client secret', async () => {
    const start = youtubeRuntime.connectStart(testBaseContext(scriptedHttp([])), {
      app: { ...APP, clientSecret: '' },
      redirectUri: REDIRECT,
      state: 's',
    });
    await expect(start).rejects.toMatchObject({
      error: { kind: 'app_config', code: 'client_secret_missing' },
    });
  });

  it('exchanges the code with the verifier and maps each channel to an account', async () => {
    const { accounts, calls } = await finish([
      token(),
      channels([
        { id: 'UCaaaaaaaaaaaaaaaaaaaaaa', snippet: { title: 'Main', customUrl: '@main' } },
        { id: 'UCbbbbbbbbbbbbbbbbbbbbbb', snippet: { title: '' } },
      ]),
    ]);
    expect(Object.fromEntries(new URLSearchParams(String(calls[0]?.body)))).toEqual({
      grant_type: 'authorization_code',
      code: 'code-1',
      client_id: APP.clientId,
      client_secret: APP.clientSecret,
      redirect_uri: REDIRECT,
      code_verifier: VERIFIER,
    });
    expect(calls[1]?.headers).toEqual({ Authorization: 'Bearer access-1' });
    const shared = {
      credentials: { accessToken: 'access-1', refreshToken: 'refresh-1' },
      grantedScopes: [UPLOAD, READONLY],
      accessExpiresAt: TEST_NOW.add({ seconds: 3599 }),
      accountKind: 'channel',
    };
    expect(accounts).toEqual([
      {
        ...shared,
        providerAccountId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
        displayName: 'Main',
        handle: '@main',
        profileUrl: 'https://www.youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa',
      },
      {
        ...shared,
        providerAccountId: 'UCbbbbbbbbbbbbbbbbbbbbbb',
        displayName: 'UCbbbbbbbbbbbbbbbbbbbbbb',
        profileUrl: 'https://www.youtube.com/channel/UCbbbbbbbbbbbbbbbbbbbbbb',
      },
    ]);
  });

  it.each([
    ['a Google account id', `h.${Buffer.from('{"sub":"1170"}').toString('base64url')}.s`, '1170'],
    ['no ID token', undefined, undefined],
    ['a malformed ID token', 'not-a-jwt', undefined],
    [
      'an ID token without sub',
      `h.${Buffer.from('{"sub":""}').toString('base64url')}.s`,
      undefined,
    ],
  ])('stores %s as the subject', async (_name, idToken, subjectId) => {
    const { accounts } = await finish([
      token({ id_token: idToken }),
      channels([{ id: 'UCaaaaaaaaaaaaaaaaaaaaaa', snippet: { title: 'Main' } }]),
    ]);
    expect(accounts?.[0]?.subjectId).toBe(subjectId);
  });

  it('records when a time-limited grant ends', async () => {
    const { accounts } = await finish([
      token({ refresh_token_expires_in: 604_800 }),
      channels([{ id: 'UCaaaaaaaaaaaaaaaaaaaaaa', snippet: { title: 'Main' } }]),
    ]);
    expect(accounts?.[0]?.refreshExpiresAt).toEqual(TEST_NOW.add({ seconds: 604_800 }));
  });

  it.each([
    ['invalid_client', 'client_invalid'],
    ['deleted_client', 'client_deleted'],
  ])('reports a %s code exchange as an app problem', async (reason, code) => {
    const refused = { method: 'POST', url: TOKEN_URL, status: 401, json: { error: reason } };
    const { error } = await finish([refused]);
    expect(error).toEqual({ kind: 'app_config', code });
  });

  it('returns no accounts when the login has no channel', async () => {
    const { accounts } = await finish([token(), channels()]);
    expect(accounts).toEqual([]);
  });

  it.each([
    ['no refresh token', token({ refresh_token: undefined }), 'refresh_token_missing'],
    ['the upload scope unticked', token({ scope: READONLY }), 'scope_missing'],
    ['the read scope unticked', token({ scope: UPLOAD }), 'scope_missing'],
    ['no scope', token({ scope: undefined }), 'scope_missing'],
  ])('fails the connect with %s, before reading channels', async (_name, exchange, code) => {
    const { error, calls } = await finish([exchange]);
    expect(error).toEqual({ kind: 'permanent', code });
    expect(calls).toHaveLength(1);
  });

  it('refuses a channel id that is not URL-safe', async () => {
    const { error } = await finish([token(), channels([{ id: 'UC/../x', snippet: {} }])]);
    expect(error).toMatchObject({ kind: 'permanent', code: 'unexpected_response' });
  });

  it('refuses a callback without a verifier or with an error', async () => {
    expect((await finish([], {})).error).toEqual({ kind: 'permanent', code: 'pending_invalid' });
    const http = scriptedHttp([]);
    const denied = youtubeRuntime.connectFinish(testBaseContext(http), {
      app: APP,
      redirectUri: REDIRECT,
      pending: { verifier: VERIFIER },
      params: { error: 'access_denied' },
    });
    await expect(denied).rejects.toMatchObject({
      error: { kind: 'permanent', code: 'authorization_denied' },
    });
  });
});
