import {
  isProviderFailure,
  type ProviderApp,
  type ProviderError,
  type RefreshInput,
} from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import {
  onlyAccount,
  type RecordedRequest,
  type ScriptedExchange,
  scriptedHttp,
  TEST_NOW,
  testBaseContext,
} from '../_kit/testing.ts';
import { type InstagramCredentials, instagramRuntime } from './runtime.ts';

const CLIENT_ID = '990011223344';
const SECRET = 'app-secret-canary-0f9e';
const REDIRECT_URI = 'https://kronaut.example.org/v1/oauth/instagram/callback';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const IG_ID = '17841400000000001';
const SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'];
const LONG_LIVED_S = 5_184_000;

const app: ProviderApp = {
  clientId: CLIENT_ID,
  clientSecret: SECRET,
  publicBaseUrl: 'https://kronaut.example.org',
};

async function failureOf(promise: Promise<unknown>): Promise<ProviderError> {
  try {
    await promise;
  } catch (error) {
    if (isProviderFailure(error)) return error.error;
    throw error;
  }
  throw new Error('expected a provider failure');
}

function query(request: RecordedRequest | undefined): Record<string, string> {
  return Object.fromEntries(new URL(request?.url ?? 'about:blank').searchParams);
}

function exchange(permissions: string): ScriptedExchange {
  return {
    method: 'POST',
    url: TOKEN_URL,
    json: { data: [{ access_token: 'short-1', user_id: 123456, permissions }] },
  };
}

const longLived: ScriptedExchange = {
  url: /^https:\/\/graph\.instagram\.com\/access_token\?/,
  json: { access_token: 'long-1', token_type: 'bearer', expires_in: LONG_LIVED_S },
};

async function finish(
  http: ReturnType<typeof scriptedHttp>,
  params: Record<string, string>,
  using = app,
) {
  return onlyAccount(
    await instagramRuntime.connectFinish(testBaseContext(http), {
      app: using,
      redirectUri: REDIRECT_URI,
      pending: {},
      params,
    }),
  );
}

function refresh(http: ReturnType<typeof scriptedHttp>, credentials: InstagramCredentials) {
  if (instagramRuntime.refresh === undefined) throw new Error('instagram refreshes');
  const input: RefreshInput<InstagramCredentials> = {
    app,
    account: { providerAccountId: IG_ID },
    credentials,
  };
  return instagramRuntime.refresh(testBaseContext(http), input);
}

function stored(ageHours: number): InstagramCredentials {
  return {
    userId: IG_ID,
    accessToken: 'long-1',
    issuedAt: TEST_NOW.subtract({ hours: ageHours }).toString(),
    scopes: SCOPES,
  };
}

const refreshUrl = /^https:\/\/graph\.instagram\.com\/refresh_access_token\?/;

describe('instagram connect', () => {
  it('builds the authorize URL on the guide host with the business scopes and state', async () => {
    const http = scriptedHttp([]);
    const started = await instagramRuntime.connectStart(testBaseContext(http), {
      app,
      redirectUri: REDIRECT_URI,
      state: 'state-1',
      loginHint: 'ignored',
    });
    const url = new URL(started.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe('https://www.instagram.com/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope:
        'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments,instagram_business_manage_insights',
      state: 'state-1',
      force_reauth: 'true',
    });
    expect(started.pending).toEqual({});
    expect(http.calls).toHaveLength(0);
  });

  it('exchanges the code, upgrades to a long-lived token and keys the account on /me user_id', async () => {
    const http = scriptedHttp([
      exchange('instagram_business_basic,instagram_business_content_publish'),
      longLived,
      {
        url: /^https:\/\/graph\.instagram\.com\/v26\.0\/me\?/,
        json: {
          user_id: IG_ID,
          username: 'alice.example',
          name: 'Alice',
          account_type: 'Media_Creator',
          id: '555',
        },
      },
    ]);
    const account = await finish(http, { code: 'code-1#_', state: 'state-1' });
    http.assertDone();

    const [code, upgrade, me] = http.calls;
    expect(code?.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(Object.fromEntries(new URLSearchParams(String(code?.body)))).toEqual({
      client_id: CLIENT_ID,
      client_secret: SECRET,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code: 'code-1',
    });
    expect(query(upgrade)).toEqual({
      grant_type: 'ig_exchange_token',
      client_secret: SECRET,
      access_token: 'short-1',
    });
    expect(new URL(me?.url ?? '').pathname).toBe('/v26.0/me');
    expect(query(me)).toEqual({
      fields: 'id,user_id,username,name,account_type,profile_picture_url',
      access_token: 'long-1',
    });
    expect(me?.body).toBeUndefined();
    expect(JSON.stringify(me)).not.toContain(SECRET);

    expect(account.accessExpiresAt?.toString()).toBe(
      TEST_NOW.add({ seconds: LONG_LIVED_S }).toString(),
    );
    expect({ ...account, accessExpiresAt: undefined }).toEqual({
      providerAccountId: IG_ID,
      subjectId: '555',
      accountKind: 'creator',
      handle: 'alice.example',
      displayName: 'Alice',
      profileUrl: 'https://www.instagram.com/alice.example/',
      capabilities: { comments: false, insights: false },
      grantedScopes: SCOPES,
      accessExpiresAt: undefined,
      credentials: {
        userId: IG_ID,
        accessToken: 'long-1',
        issuedAt: TEST_NOW.toString(),
        scopes: SCOPES,
      },
    });
    expect(instagramRuntime.parseCredentials(account.credentials)).toEqual(account.credentials);
  });

  it('refuses a grant without content publishing before any long-lived exchange', async () => {
    const http = scriptedHttp([exchange('instagram_business_basic')]);
    expect(await failureOf(finish(http, { code: 'code-1', state: 'state-1' }))).toEqual({
      kind: 'permanent',
      code: 'missing_permission',
    });
    http.assertDone();
    expect(http.calls).toHaveLength(1);
  });

  it('maps a code-exchange error to a fixed code and a missing secret to app_config', async () => {
    const message = 'Matching code was not found CANARY-7a1c';
    const http = scriptedHttp([
      {
        method: 'POST',
        url: TOKEN_URL,
        status: 400,
        json: { error_type: 'OAuthException', code: 400, error_message: message },
      },
    ]);
    let thrown: unknown;
    try {
      await finish(http, { code: 'code-1', state: 'state-1' });
    } catch (error) {
      thrown = error;
    }
    if (!isProviderFailure(thrown)) throw new Error('expected a provider failure');
    expect(thrown.error).toEqual({ kind: 'permanent', code: 'code_exchange_failed' });
    for (const rendering of [thrown.message, thrown.stack ?? '', JSON.stringify(thrown.error)]) {
      expect(rendering).not.toContain('CANARY-7a1c');
    }

    const silent = scriptedHttp([]);
    const { clientSecret: _, ...withoutSecret } = app;
    expect(
      await failureOf(finish(silent, { code: 'code-1', state: 'state-1' }, withoutSecret)),
    ).toEqual({ kind: 'app_config', code: 'client_secret_missing' });
    expect(silent.calls).toHaveLength(0);
    expect(
      await failureOf(
        instagramRuntime.connectStart(testBaseContext(silent), {
          app: withoutSecret,
          redirectUri: REDIRECT_URI,
          state: 'state-1',
        }),
      ),
    ).toEqual({ kind: 'app_config', code: 'client_secret_missing' });
  });
});

describe('instagram refresh', () => {
  it('persists the returned token, waits 24 h after issue and maps 190 subcodes and 429', async () => {
    const http = scriptedHttp([
      {
        url: refreshUrl,
        json: { access_token: 'long-2', token_type: 'bearer', expires_in: LONG_LIVED_S },
      },
    ]);
    const issued = await refresh(http, stored(25));
    http.assertDone();
    expect(query(http.calls[0])).toEqual({
      grant_type: 'ig_refresh_token',
      access_token: 'long-1',
    });
    expect(issued.credentials).toEqual({
      userId: IG_ID,
      accessToken: 'long-2',
      issuedAt: TEST_NOW.toString(),
      scopes: SCOPES,
    });
    expect(issued.grantedScopes).toEqual(SCOPES);
    expect(issued.accessExpiresAt?.toString()).toBe(
      TEST_NOW.add({ seconds: LONG_LIVED_S }).toString(),
    );

    const early = scriptedHttp([]);
    expect(await failureOf(refresh(early, stored(23)))).toEqual({
      kind: 'transient',
      detail: 'refresh_too_early',
    });
    expect(early.calls).toHaveLength(0);

    for (const [subcode, expected] of [
      [463, { kind: 'auth_expired' }],
      [460, { kind: 'auth_revoked' }],
      [464, { kind: 'permanent', code: 'user_action_required', detail: '190/464' }],
      [undefined, { kind: 'auth_expired' }],
    ] as const) {
      const rejected = scriptedHttp([
        {
          url: refreshUrl,
          status: 400,
          json: { error: { type: 'OAuthException', code: 190, error_subcode: subcode } },
        },
      ]);
      expect(await failureOf(refresh(rejected, stored(25)))).toEqual(expected);
    }

    const limited = scriptedHttp([
      { url: refreshUrl, status: 429, headers: { 'retry-after': '120' } },
    ]);
    expect(await failureOf(refresh(limited, stored(25)))).toMatchObject({
      kind: 'rate_limited',
      scope: 'account',
    });
  });
});
