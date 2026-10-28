import { createHmac } from 'node:crypto';
import { isProviderFailure, type ProviderApp, type ProviderError } from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { conformanceProblems } from '../_kit/conformance.ts';
import {
  type RecordedRequest,
  type ScriptedExchange,
  scriptedHttp,
  testBaseContext,
} from '../_kit/testing.ts';
import { facebookManifest } from './manifest.ts';
import { facebookRuntime } from './runtime.ts';

const CLIENT_ID = '1234567890123456';
const SECRET = 'facebook-secret-canary-7c1a';
const REDIRECT_URI = 'https://kronaut.example.org/v1/oauth/facebook/callback';
const GRAPH = 'https://graph.facebook.com/v26.0';
const SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'pages_manage_engagement',
];
const EXPIRES_AT = 1_798_000_000;
const NEXT = `${GRAPH}/me/accounts?access_token=user-long-1&limit=100&after=CURSOR`;

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

function proof(token: string): string {
  return createHmac('sha256', SECRET).update(token).digest('hex');
}

const codeExchange: ScriptedExchange = {
  url: /^https:\/\/graph\.facebook\.com\/v26\.0\/oauth\/access_token\?client_id=/,
  json: { access_token: 'short-1', token_type: 'bearer', expires_in: 5_183 },
};

const longLived: ScriptedExchange = {
  url: /^https:\/\/graph\.facebook\.com\/v26\.0\/oauth\/access_token\?grant_type=fb_exchange_token/,
  json: { access_token: 'user-long-1', token_type: 'bearer', expires_in: 5_183_944 },
};

function accounts(data: readonly unknown[], next?: string): ScriptedExchange {
  return {
    url: /^https:\/\/graph\.facebook\.com\/v26\.0\/me\/accounts\?/,
    json: {
      data,
      paging: {
        cursors: { before: 'B', after: 'CURSOR' },
        ...(next === undefined ? {} : { next }),
      },
    },
  };
}

function page(id: string, tasks: readonly string[], extra: Record<string, unknown> = {}) {
  return { id, name: `Page ${id}`, access_token: `page-token-${id}`, tasks, ...extra };
}

function debug(expiresAt: number, data: Record<string, unknown> = {}): ScriptedExchange {
  return {
    url: /^https:\/\/graph\.facebook\.com\/v26\.0\/debug_token\?/,
    json: {
      data: {
        app_id: CLIENT_ID,
        type: 'PAGE',
        is_valid: true,
        expires_at: expiresAt,
        scopes: SCOPES,
        ...data,
      },
    },
  };
}

function finish(
  http: ReturnType<typeof scriptedHttp>,
  params: Record<string, string>,
  using = app,
) {
  return facebookRuntime.connectFinish(testBaseContext(http), {
    app: using,
    redirectUri: REDIRECT_URI,
    pending: {},
    params,
  });
}

const code = { code: 'code-1', state: 'state-1' };

describe('facebook connect', () => {
  it('builds the versioned login dialog URL with the Page scopes and rerequest', async () => {
    const http = scriptedHttp([]);
    const started = await facebookRuntime.connectStart(testBaseContext(http), {
      app,
      redirectUri: REDIRECT_URI,
      state: 'state-1',
    });
    const url = new URL(started.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe('https://www.facebook.com/v26.0/dialog/oauth');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      state: 'state-1',
      response_type: 'code',
      scope: 'pages_show_list,pages_manage_posts,pages_read_engagement,pages_manage_engagement',
      auth_type: 'rerequest',
    });
    expect(started.pending).toEqual({});
    expect(http.calls).toHaveLength(0);
  });

  it('returns one account per Page that can create content, across pages of /me/accounts', async () => {
    const http = scriptedHttp([
      codeExchange,
      longLived,
      accounts(
        [
          page('101', ['ANALYZE', 'CREATE_CONTENT'], {
            link: 'https://www.facebook.com/alpha',
            username: 'alpha',
          }),
          page('102', ['ANALYZE', 'MODERATE']),
        ],
        NEXT,
      ),
      accounts([page('103', ['CREATE_CONTENT'], { link: 'javascript:alert(1)' })]),
      debug(EXPIRES_AT),
      debug(0, { scopes: ['pages_show_list'] }),
    ]);
    const connected = await finish(http, code);
    http.assertDone();

    const [exchange, upgrade, first, second, debugA, debugC] = http.calls;
    expect(query(exchange)).toEqual({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      client_secret: SECRET,
      code: 'code-1',
    });
    expect(query(upgrade)).toEqual({
      grant_type: 'fb_exchange_token',
      client_id: CLIENT_ID,
      client_secret: SECRET,
      fb_exchange_token: 'short-1',
    });
    expect(query(first)).toEqual({
      fields: 'id,name,access_token,tasks,link,username',
      limit: '100',
      access_token: 'user-long-1',
      appsecret_proof: proof('user-long-1'),
    });
    expect(query(second)).toEqual({
      limit: '100',
      after: 'CURSOR',
      access_token: 'user-long-1',
      appsecret_proof: proof('user-long-1'),
    });
    expect(query(debugA)).toEqual({
      input_token: 'page-token-101',
      access_token: `${CLIENT_ID}|${SECRET}`,
    });
    expect(query(debugC).input_token).toBe('page-token-103');
    for (const call of [exchange, upgrade, debugA, debugC])
      expect(query(call)).not.toHaveProperty('appsecret_proof');

    expect(connected).toEqual([
      {
        providerAccountId: '101',
        accountKind: 'page',
        displayName: 'Page 101',
        handle: 'alpha',
        profileUrl: 'https://www.facebook.com/alpha',
        grantedScopes: SCOPES,
        accessExpiresAt: Temporal.Instant.fromEpochMilliseconds(EXPIRES_AT * 1000),
        credentials: { accessToken: 'page-token-101' },
        capabilities: { comments: true },
      },
      {
        providerAccountId: '103',
        accountKind: 'page',
        displayName: 'Page 103',
        grantedScopes: ['pages_show_list'],
        credentials: { accessToken: 'page-token-103' },
        capabilities: { comments: false },
      },
    ]);
    for (const account of connected)
      expect(facebookRuntime.parseCredentials(account.credentials)).toEqual(account.credentials);
    expect(JSON.stringify(connected)).not.toMatch(/short-1|user-long-1/);
  });

  it('returns no accounts when no Page was shared', async () => {
    const http = scriptedHttp([codeExchange, longLived, accounts([])]);
    expect(await finish(http, code)).toEqual([]);
    http.assertDone();
  });

  it('refuses more than 100 Pages before checking any token', async () => {
    const pages = Array.from({ length: 101 }, (_, i) => page(String(1000 + i), ['CREATE_CONTENT']));
    const http = scriptedHttp([codeExchange, longLived, accounts(pages)]);
    expect(await failureOf(finish(http, code))).toEqual({
      kind: 'permanent',
      code: 'too_many_accounts',
    });
    http.assertDone();
  });

  it('follows paging.next only on graph.facebook.com and at most 10 times', async () => {
    for (const next of [
      'https://graph.facebook.example/v26.0/me/accounts?after=CURSOR',
      'http://graph.facebook.com/v26.0/me/accounts?after=CURSOR',
    ]) {
      const http = scriptedHttp([
        codeExchange,
        longLived,
        accounts([page('101', ['CREATE_CONTENT'])], next),
        debug(0),
      ]);
      expect(await finish(http, code)).toHaveLength(1);
      http.assertDone();
    }

    const endless = scriptedHttp([
      codeExchange,
      longLived,
      ...Array.from({ length: 11 }, () => accounts([], NEXT)),
    ]);
    expect(await finish(endless, code)).toEqual([]);
    endless.assertDone();
  });

  it('maps Graph errors through the Meta kit without echoing their text', async () => {
    const rejected = scriptedHttp([
      {
        ...codeExchange,
        status: 400,
        json: {
          error: {
            message: 'This authorization code has expired CANARY-5d1e',
            type: 'OAuthException',
            code: 100,
            error_subcode: 36007,
          },
        },
      },
    ]);
    let thrown: unknown;
    try {
      await finish(rejected, code);
    } catch (error) {
      thrown = error;
    }
    if (!isProviderFailure(thrown)) throw new Error('expected a provider failure');
    expect(thrown.error).toEqual({ kind: 'permanent', code: 'graph_error', detail: '100/36007' });
    for (const rendering of [thrown.message, thrown.stack ?? '', JSON.stringify(thrown.error)])
      expect(rendering).not.toContain('CANARY-5d1e');

    const revoked = scriptedHttp([
      codeExchange,
      longLived,
      {
        ...accounts([]),
        status: 400,
        json: { error: { type: 'OAuthException', code: 190, error_subcode: 460 } },
      },
    ]);
    expect(await failureOf(finish(revoked, code))).toEqual({ kind: 'auth_revoked' });

    const down = scriptedHttp([{ ...codeExchange, status: 503 }]);
    expect(await failureOf(finish(down, code))).toEqual({ kind: 'transient', detail: 'http_503' });
  });

  it('fails the whole connect when a Page token does not check out', async () => {
    const shared = [codeExchange, longLived, accounts([page('101', ['CREATE_CONTENT'])])];
    for (const [check, expected] of [
      [debug(0, { is_valid: false }), { kind: 'permanent', code: 'page_token_invalid' }],
      [debug(0, { app_id: '999' }), { kind: 'permanent', code: 'page_token_app_mismatch' }],
      [
        { ...debug(0), status: 500 },
        { kind: 'transient', detail: 'http_500' },
      ],
    ] as const) {
      const http = scriptedHttp([...shared, check]);
      expect(await failureOf(finish(http, code))).toEqual(expected);
    }
  });

  it('refuses a denial, a missing code or a missing secret before any request', async () => {
    const http = scriptedHttp([]);
    expect(await failureOf(finish(http, { error: 'access_denied', state: 'state-1' }))).toEqual({
      kind: 'permanent',
      code: 'authorization_denied',
    });
    expect(await failureOf(finish(http, { state: 'state-1' }))).toEqual({
      kind: 'permanent',
      code: 'code_missing',
    });
    const { clientSecret: _, ...withoutSecret } = app;
    expect(await failureOf(finish(http, code, withoutSecret))).toEqual({
      kind: 'app_config',
      code: 'client_secret_missing',
    });
    expect(http.calls).toHaveLength(0);
  });
});

describe('facebook publishing', () => {
  it('publishes through the API and conforms to the provider contract', () => {
    expect(facebookManifest.postTypes.map((type) => type.delivery)).toEqual(['api', 'api']);
    expect(conformanceProblems(facebookManifest, facebookRuntime)).toEqual([]);
  });
});
