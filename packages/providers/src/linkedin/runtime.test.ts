import { isProviderFailure, type ProviderApp, type ProviderError } from '@kronaut/core';
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
import { linkedinManifest } from './manifest.ts';
import { linkedinRuntime } from './runtime.ts';

const CLIENT_ID = '86abcdef123xyz';
const SECRET = 'linkedin-secret-canary-91fe';
const REDIRECT_URI = 'https://kronaut.example.org/v1/oauth/linkedin/callback';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const SIXTY_DAYS_S = 5_184_000;

const app: ProviderApp = {
  clientId: CLIENT_ID,
  clientSecret: SECRET,
  publicBaseUrl: 'https://kronaut.example.org',
};

async function failureOf(promise: Promise<unknown>): Promise<ProviderFailureShape> {
  try {
    await promise;
  } catch (error) {
    if (isProviderFailure(error)) return { error: error.error, rendered: renderings(error) };
    throw error;
  }
  throw new Error('expected a provider failure');
}

interface ProviderFailureShape {
  readonly error: ProviderError;
  readonly rendered: string;
}

function renderings(error: Error & { error: ProviderError }): string {
  return [error.message, error.stack ?? '', JSON.stringify(error.error)].join('\n');
}

function form(request: RecordedRequest | undefined): Record<string, string> {
  if (typeof request?.body !== 'string') throw new Error('expected a form body');
  expect(request.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  return Object.fromEntries(new URLSearchParams(request.body));
}

function token(extra: Record<string, unknown> = {}): ScriptedExchange {
  return {
    method: 'POST',
    url: TOKEN_URL,
    json: { access_token: 'member-token-1', expires_in: SIXTY_DAYS_S, ...extra },
  };
}

function userinfo(json: Record<string, unknown> = {}): ScriptedExchange {
  return {
    url: USERINFO_URL,
    json: { sub: 'aB3_x-9Q', name: 'Ada Novák', given_name: 'Ada', ...json },
  };
}

function finish(http: ReturnType<typeof scriptedHttp>, params: Record<string, string>) {
  return linkedinRuntime.connectFinish(testBaseContext(http), {
    app,
    redirectUri: REDIRECT_URI,
    pending: {},
    params,
  });
}

const code = { code: 'code-1', state: 'state-1' };

describe('linkedin connect', () => {
  it('builds the authorization URL with the three self-serve scopes', async () => {
    const http = scriptedHttp([]);
    const started = await linkedinRuntime.connectStart(testBaseContext(http), {
      app,
      redirectUri: REDIRECT_URI,
      state: 'state-1',
    });
    const url = new URL(started.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe('https://www.linkedin.com/oauth/v2/authorization');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      state: 'state-1',
      scope: 'openid profile w_member_social',
    });
    expect(started.authorizationUrl).toContain('scope=openid+profile+w_member_social');
    expect(started.pending).toEqual({});
    expect(http.calls).toHaveLength(0);
  });

  it('exchanges the code, reads userinfo and returns the member as one account', async () => {
    const http = scriptedHttp([token({ scope: 'openid,profile,w_member_social' }), userinfo()]);
    const account = onlyAccount(await finish(http, code));
    http.assertDone();

    const [exchange, me] = http.calls;
    expect(form(exchange)).toEqual({
      grant_type: 'authorization_code',
      code: 'code-1',
      client_id: CLIENT_ID,
      client_secret: SECRET,
      redirect_uri: REDIRECT_URI,
    });
    expect(me?.method).toBe('GET');
    expect(me?.headers).toEqual({ Authorization: 'Bearer member-token-1' });
    expect(account).toEqual({
      credentials: { accessToken: 'member-token-1' },
      grantedScopes: ['openid', 'profile', 'w_member_social'],
      accessExpiresAt: TEST_NOW.add({ seconds: SIXTY_DAYS_S }),
      providerAccountId: 'aB3_x-9Q',
      accountKind: 'person',
      displayName: 'Ada Novák',
    });
    expect(linkedinRuntime.parseCredentials(account.credentials)).toEqual(account.credentials);
  });

  it('falls back to the requested scopes, keeps a partner refresh token and a nameless sub', async () => {
    const http = scriptedHttp([token({ refresh_token: 'refresh-1' }), userinfo({ name: ' ' })]);
    const account = onlyAccount(await finish(http, code));
    expect(account.grantedScopes).toEqual(['openid', 'profile', 'w_member_social']);
    expect(account.credentials).toEqual({
      accessToken: 'member-token-1',
      refreshToken: 'refresh-1',
    });
    expect(account.displayName).toBe('aB3_x-9Q');
  });

  it('refuses a denial or a missing code before any request', async () => {
    const http = scriptedHttp([]);
    const denied = await failureOf(
      finish(http, { error: 'user_cancelled_authorize', error_description: 'x', state: 's' }),
    );
    expect(denied.error).toEqual({ kind: 'permanent', code: 'authorization_denied' });
    const missing = await failureOf(finish(http, { state: 's' }));
    expect(missing.error).toEqual({ kind: 'permanent', code: 'code_missing' });
    expect(http.calls).toHaveLength(0);
  });

  it('maps a rejected code exchange without echoing the error text', async () => {
    const http = scriptedHttp([
      {
        ...token(),
        status: 401,
        json: {
          error: 'invalid_request',
          error_description: 'authorization code not found CANARY-member-token-7e',
        },
      },
    ]);
    const rejected = await failureOf(finish(http, code));
    expect(rejected.error).toEqual({
      kind: 'permanent',
      code: 'code_exchange_failed',
      detail: 'http_401',
    });
    expect(rejected.rendered).not.toContain('CANARY');

    const down = await failureOf(finish(scriptedHttp([{ ...token(), status: 503 }]), code));
    expect(down.error).toEqual({ kind: 'transient', detail: 'http_503' });
  });

  it('maps a revoked token on userinfo and never leaks the access token', async () => {
    const http = scriptedHttp([
      token({ access_token: 'CANARY-access-5c' }),
      {
        ...userinfo(),
        status: 401,
        json: { status: 401, serviceErrorCode: 65601, message: 'CANARY-access-5c revoked' },
      },
    ]);
    const revoked = await failureOf(finish(http, code));
    expect(revoked.error).toEqual({ kind: 'auth_revoked' });
    expect(revoked.rendered).not.toContain('CANARY');
  });
});

describe('linkedin contract', () => {
  it('publishes through the API and conforms to the provider contract', () => {
    expect(linkedinManifest.postTypes.map((type) => type.delivery)).toEqual(['api']);
    expect(linkedinManifest.verify.mode).toBe('none');
    expect(conformanceProblems(linkedinManifest, linkedinRuntime)).toEqual([]);
  });
});
