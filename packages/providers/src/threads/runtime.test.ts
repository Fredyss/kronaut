import {
  isProviderFailure,
  type ProviderApp,
  type ProviderError,
  type RefreshInput,
} from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { conformanceProblems } from '../_kit/conformance.ts';
import {
  onlyAccount,
  type RecordedRequest,
  type ScriptedExchange,
  scriptedHttp,
  TEST_NOW,
  testBaseContext,
} from '../_kit/testing.ts';
import { threadsManifest } from './manifest.ts';
import { type ThreadsCredentials, threadsRuntime } from './runtime.ts';

const CLIENT_ID = '1122334455667788';
const SECRET = 'threads-secret-canary-4b2d';
const REDIRECT_URI = 'https://kronaut.example.org/v1/oauth/threads/callback';
const TOKEN_URL = 'https://graph.threads.com/oauth/access_token';
const USER_ID = '1234567';
const SCOPES = ['threads_basic', 'threads_content_publish', 'threads_manage_replies'];
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

const codeExchange: ScriptedExchange = {
  method: 'POST',
  url: TOKEN_URL,
  json: { access_token: 'short-1', token_type: 'bearer', user_id: 17841405793187218 },
};

const longLived: ScriptedExchange = {
  url: /^https:\/\/graph\.threads\.com\/access_token\?/,
  json: { access_token: 'long-1', token_type: 'bearer', expires_in: LONG_LIVED_S },
};

const GRANTED = [...SCOPES, 'threads_manage_insights'];
const debugToken: ScriptedExchange = {
  url: /^https:\/\/graph\.threads\.com\/v1\.0\/debug_token\?/,
  json: { data: { type: 'USER', is_valid: true, scopes: GRANTED, user_id: USER_ID } },
};

function me(name?: string | null): ScriptedExchange {
  return {
    url: /^https:\/\/graph\.threads\.com\/v1\.0\/me\?/,
    json: {
      id: USER_ID,
      username: 'alice.example',
      ...(name === undefined ? {} : { name }),
      threads_profile_picture_url: 'https://cdn.example.org/alice.jpg',
    },
  };
}

async function finish(
  http: ReturnType<typeof scriptedHttp>,
  params: Record<string, string>,
  using = app,
) {
  return onlyAccount(
    await threadsRuntime.connectFinish(testBaseContext(http), {
      app: using,
      redirectUri: REDIRECT_URI,
      pending: {},
      params,
    }),
  );
}

function refresh(http: ReturnType<typeof scriptedHttp>, credentials: ThreadsCredentials) {
  if (threadsRuntime.refresh === undefined) throw new Error('threads refreshes');
  const input: RefreshInput<ThreadsCredentials> = {
    app,
    account: { providerAccountId: USER_ID },
    credentials,
  };
  return threadsRuntime.refresh(testBaseContext(http), input);
}

function stored(ageHours: number): ThreadsCredentials {
  return {
    userId: USER_ID,
    accessToken: 'long-1',
    issuedAt: TEST_NOW.subtract({ hours: ageHours }).toString(),
    scopes: SCOPES,
  };
}

const refreshUrl = /^https:\/\/graph\.threads\.com\/refresh_access_token\?/;

describe('threads connect', () => {
  it('builds the authorize URL on threads.com with all scopes and the state', async () => {
    const http = scriptedHttp([]);
    const started = await threadsRuntime.connectStart(testBaseContext(http), {
      app,
      redirectUri: REDIRECT_URI,
      state: 'state-1',
      loginHint: 'ignored',
    });
    const url = new URL(started.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe('https://threads.com/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'threads_basic,threads_content_publish,threads_manage_replies,threads_manage_insights',
      response_type: 'code',
      state: 'state-1',
    });
    expect(started.pending).toEqual({});
    expect(http.calls).toHaveLength(0);
  });

  it('strips #_, exchanges the code, upgrades it to a long-lived token and reads /me', async () => {
    const http = scriptedHttp([codeExchange, longLived, me('  Alice  '), debugToken]);
    const account = await finish(http, { code: 'code-1#_', state: 'state-1' });
    http.assertDone();

    const [code, upgrade, profile, debug] = http.calls;
    expect(query(debug)).toEqual({
      input_token: 'long-1',
      access_token: `TH|${CLIENT_ID}|${SECRET}`,
    });
    expect(code?.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(Object.fromEntries(new URLSearchParams(String(code?.body)))).toEqual({
      client_id: CLIENT_ID,
      client_secret: SECRET,
      code: 'code-1',
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    });
    expect(new URL(code?.url ?? '').search).toBe('');
    expect(query(upgrade)).toEqual({
      grant_type: 'th_exchange_token',
      client_secret: SECRET,
      access_token: 'short-1',
    });
    expect(new URL(profile?.url ?? '').pathname).toBe('/v1.0/me');
    expect(query(profile)).toEqual({
      fields: 'id,username,name,threads_profile_picture_url',
      access_token: 'long-1',
    });
    expect(JSON.stringify(profile)).not.toContain(SECRET);

    expect(account.accessExpiresAt?.toString()).toBe(
      TEST_NOW.add({ seconds: LONG_LIVED_S }).toString(),
    );
    expect({ ...account, accessExpiresAt: undefined }).toEqual({
      providerAccountId: USER_ID,
      subjectId: USER_ID,
      accountKind: 'personal',
      handle: '@alice.example',
      displayName: 'Alice',
      profileUrl: 'https://www.threads.com/@alice.example',
      capabilities: { replies: true, insights: true },
      grantedScopes: GRANTED,
      accessExpiresAt: undefined,
      credentials: {
        userId: USER_ID,
        accessToken: 'long-1',
        issuedAt: TEST_NOW.toString(),
        scopes: GRANTED,
      },
    });
    expect(threadsRuntime.parseCredentials(account.credentials)).toEqual(account.credentials);
  });

  it('connects without insights when the scope check fails or the token is invalid', async () => {
    const refused = { ...debugToken, status: 400, json: { error: { code: 190 } } };
    const invalid = { ...debugToken, json: { data: { is_valid: false, scopes: GRANTED } } };
    for (const check of [refused, invalid]) {
      const http = scriptedHttp([codeExchange, longLived, me('Alice'), check]);
      const account = await finish(http, { code: 'code-1', state: 'state-1' });
      http.assertDone();
      expect(account.credentials.scopes).toEqual(SCOPES);
      expect(account.capabilities).toEqual({ replies: true, insights: false });
    }
  });

  it('falls back to the username when /me has no usable name', async () => {
    for (const name of [undefined, null, ' ']) {
      const http = scriptedHttp([codeExchange, longLived, me(name), debugToken]);
      const account = await finish(http, { code: 'code-1', state: 'state-1' });
      expect(account.displayName).toBe('alice.example');
    }
  });

  it('refuses a denial or a missing code before any request', async () => {
    const http = scriptedHttp([]);
    expect(await failureOf(finish(http, { error: 'access_denied', state: 'state-1' }))).toEqual({
      kind: 'permanent',
      code: 'authorization_denied',
    });
    expect(await failureOf(finish(http, { code: '#_', state: 'state-1' }))).toEqual({
      kind: 'permanent',
      code: 'code_missing',
    });
    expect(http.calls).toHaveLength(0);
  });

  it('maps a code-exchange error to a fixed code, 5xx to transient and no secret to app_config', async () => {
    const http = scriptedHttp([
      {
        method: 'POST',
        url: TOKEN_URL,
        status: 400,
        json: {
          error_type: 'OAuthException',
          code: 400,
          error_message: 'Matching code was not found CANARY-3e9f',
        },
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
      expect(rendering).not.toContain('CANARY-3e9f');
    }

    const down = scriptedHttp([{ method: 'POST', url: TOKEN_URL, status: 503 }]);
    expect(await failureOf(finish(down, { code: 'code-1', state: 'state-1' }))).toEqual({
      kind: 'transient',
      detail: 'http_503',
    });

    const upgradeRevoked = scriptedHttp([
      codeExchange,
      { ...longLived, status: 400, json: { error: { type: 'OAuthException', code: 190 } } },
    ]);
    expect(await failureOf(finish(upgradeRevoked, { code: 'code-1', state: 'state-1' }))).toEqual({
      kind: 'auth_expired',
    });

    const silent = scriptedHttp([]);
    const { clientSecret: _, ...withoutSecret } = app;
    expect(
      await failureOf(finish(silent, { code: 'code-1', state: 'state-1' }, withoutSecret)),
    ).toEqual({ kind: 'app_config', code: 'client_secret_missing' });
    expect(
      await failureOf(
        threadsRuntime.connectStart(testBaseContext(silent), {
          app: withoutSecret,
          redirectUri: REDIRECT_URI,
          state: 'state-1',
        }),
      ),
    ).toEqual({ kind: 'app_config', code: 'client_secret_missing' });
    expect(silent.calls).toHaveLength(0);
  });
});

describe('threads refresh', () => {
  it('persists the refreshed token with a new expiry and issue time', async () => {
    const http = scriptedHttp([
      {
        url: refreshUrl,
        json: { access_token: 'long-2', token_type: 'bearer', expires_in: LONG_LIVED_S },
      },
    ]);
    const issued = await refresh(http, stored(25));
    http.assertDone();
    expect(query(http.calls[0])).toEqual({
      grant_type: 'th_refresh_token',
      access_token: 'long-1',
    });
    expect(JSON.stringify(http.calls[0])).not.toContain(SECRET);
    expect(issued).toEqual({
      credentials: {
        userId: USER_ID,
        accessToken: 'long-2',
        issuedAt: TEST_NOW.toString(),
        scopes: SCOPES,
      },
      grantedScopes: SCOPES,
      accessExpiresAt: TEST_NOW.add({ seconds: LONG_LIVED_S }),
    });
  });

  it('sends nothing for a token younger than 24 h', async () => {
    const early = scriptedHttp([]);
    expect(await failureOf(refresh(early, stored(23)))).toEqual({
      kind: 'transient',
      detail: 'refresh_too_early',
    });
    expect(early.calls).toHaveLength(0);
  });

  it('maps 190 subcodes, 429 and 5xx', async () => {
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
    expect(await failureOf(refresh(limited, stored(25)))).toEqual({
      kind: 'rate_limited',
      scope: 'account',
      resetAt: TEST_NOW.add({ seconds: 120 }),
    });

    const down = scriptedHttp([{ url: refreshUrl, status: 502 }]);
    expect(await failureOf(refresh(down, stored(25)))).toEqual({
      kind: 'transient',
      detail: 'http_502',
    });
  });
});

describe('threads publishing', () => {
  it('is schedulable and conforms to the provider contract', () => {
    expect(threadsManifest.postTypes.map((type) => type.delivery)).toEqual(['api', 'api']);
    expect(conformanceProblems(threadsManifest, threadsRuntime)).toEqual([]);
  });
});
