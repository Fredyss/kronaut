import { createHash } from 'node:crypto';
import {
  isProviderFailure,
  type ProviderApp,
  type ProviderError,
  type RegisterAppInput,
} from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { conformanceProblems } from '../_kit/conformance.ts';
import {
  egressError,
  onlyAccount,
  type ScriptedExchange,
  scriptedHttp,
  TEST_NOW,
  testBaseContext,
} from '../_kit/testing.ts';
import { mastodonManifest } from './manifest.ts';
import { mastodonRuntime } from './runtime.ts';

const HOST = 'social.example.org';
const ORIGIN = `https://${HOST}`;
const REDIRECT_URI = 'https://kronaut.example.org/v1/oauth/mastodon/callback';
const SECRET = 'CANARY_client_secret';
const VERIFIER = 'CANARY_verifier';
const SCOPE = 'read:accounts read:statuses write:statuses write:media';

const app: ProviderApp = {
  clientId: 'client-1',
  clientSecret: SECRET,
  publicBaseUrl: 'https://kronaut.example.org',
  instanceHost: HOST,
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

function register(http: ReturnType<typeof scriptedHttp>, input: Partial<RegisterAppInput> = {}) {
  if (mastodonRuntime.registerApp === undefined) throw new Error('mastodon registers apps');
  return mastodonRuntime.registerApp(testBaseContext(http), {
    instanceHost: HOST,
    redirectUri: REDIRECT_URI,
    clientName: 'Kronaut',
    ...input,
  });
}

async function finish(http: ReturnType<typeof scriptedHttp>, params: Record<string, string>) {
  return onlyAccount(
    await mastodonRuntime.connectFinish(testBaseContext(http), {
      app,
      redirectUri: REDIRECT_URI,
      pending: { verifier: VERIFIER },
      params,
    }),
  );
}

const token = (status = 200, json: unknown = undefined): ScriptedExchange => ({
  method: 'POST',
  url: `${ORIGIN}/oauth/token`,
  status,
  json: json ?? {
    access_token: 'CANARY_access',
    token_type: 'Bearer',
    scope: SCOPE,
    created_at: 1_761_000_000,
  },
});

const me = (displayName: string | null): ScriptedExchange => ({
  url: `${ORIGIN}/api/v1/accounts/verify_credentials`,
  json: {
    id: '109876543210',
    username: 'alice',
    acct: 'alice',
    display_name: displayName,
    url: `${ORIGIN}/@alice`,
  },
});

function instance(descriptionLimit?: number): ScriptedExchange {
  return {
    url: `${ORIGIN}/api/v2/instance`,
    json: {
      domain: HOST,
      configuration: {
        statuses: {
          max_characters: 1000,
          max_media_attachments: 4,
          characters_reserved_per_url: 23,
        },
        media_attachments: {
          supported_mime_types: ['image/jpeg', 'image/png'],
          image_size_limit: 16_777_216,
          image_matrix_limit: 33_177_600,
          video_size_limit: 103_809_024,
          video_frame_rate_limit: 120,
          video_matrix_limit: 8_294_400,
          ...(descriptionLimit === undefined ? {} : { description_limit: descriptionLimit }),
        },
      },
    },
  };
}

describe('mastodon provider', () => {
  it('passes the conformance checks', () => {
    expect(conformanceProblems(mastodonManifest, mastodonRuntime)).toEqual([]);
  });

  it('publishes posts through the API and verifies by reading recent statuses', () => {
    expect(mastodonManifest.postTypes.map((type) => [type.id, type.delivery])).toEqual([
      ['post', 'api'],
      ['video', 'api'],
    ]);
    expect(mastodonManifest.verify).toEqual({ mode: 'list_recent_match', windowMs: 3_600_000 });
  });
});

describe('mastodon registerApp', () => {
  it('posts the app as JSON with one redirect URI and the scopes', async () => {
    const http = scriptedHttp([
      {
        method: 'POST',
        url: `${ORIGIN}/api/v1/apps`,
        json: { id: '1', client_id: 'client-new', client_secret: SECRET },
      },
    ]);
    expect(await register(http)).toEqual({ clientId: 'client-new', clientSecret: SECRET });
    http.assertDone();
    const [call] = http.calls;
    expect(call?.headers['content-type']).toBe('application/json');
    expect(JSON.parse(String(call?.body))).toEqual({
      client_name: 'Kronaut',
      redirect_uris: [REDIRECT_URI],
      scopes: SCOPE,
    });
  });

  it('maps a refusal to permanent, an outage to transient and a blocked host to permanent', async () => {
    const refused = scriptedHttp([
      { method: 'POST', url: `${ORIGIN}/api/v1/apps`, status: 422, json: { error: 'x' } },
    ]);
    expect(await failureOf(register(refused))).toEqual({
      kind: 'permanent',
      code: 'app_registration_rejected',
    });
    const down = scriptedHttp([{ method: 'POST', url: `${ORIGIN}/api/v1/apps`, status: 502 }]);
    expect(await failureOf(register(down))).toMatchObject({ kind: 'transient' });
    const blocked = scriptedHttp([
      { method: 'POST', url: `${ORIGIN}/api/v1/apps`, error: egressError('blocked_private') },
    ]);
    expect(await failureOf(register(blocked))).toMatchObject({
      kind: 'permanent',
      code: 'egress_blocked',
    });
  });

  it('refuses a host that is not a bare host', async () => {
    const http = scriptedHttp([]);
    expect(await failureOf(register(http, { instanceHost: 'evil.example/x' }))).toMatchObject({
      kind: 'app_config',
    });
    expect(http.calls).toHaveLength(0);
  });
});

describe('mastodon connect', () => {
  it('builds the authorize URL on the instance with PKCE S256 and the state', async () => {
    const started = await mastodonRuntime.connectStart(testBaseContext(scriptedHttp([])), {
      app,
      redirectUri: REDIRECT_URI,
      state: 'state-1',
    });
    const url = new URL(started.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(`${ORIGIN}/oauth/authorize`);
    const verifier = String(started.pending.verifier);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'client-1',
      redirect_uri: REDIRECT_URI,
      scope: SCOPE,
      state: 'state-1',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    });
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('needs the instance host and the client secret', async () => {
    const ctx = testBaseContext(scriptedHttp([]));
    const input = { redirectUri: REDIRECT_URI, state: 's' };
    const { instanceHost: _host, ...noHost } = app;
    expect(await failureOf(mastodonRuntime.connectStart(ctx, { ...input, app: noHost }))).toEqual({
      kind: 'app_config',
      code: 'instance_host_missing',
    });
    const { clientSecret: _secret, ...noSecret } = app;
    expect(await failureOf(mastodonRuntime.connectStart(ctx, { ...input, app: noSecret }))).toEqual(
      { kind: 'app_config', code: 'client_secret_missing' },
    );
  });

  it('exchanges the code with the secret and verifier and maps the account', async () => {
    const http = scriptedHttp([token(), me(' Alice A. '), instance(1500)]);
    const account = await finish(http, { code: 'CODE-1', state: 's' });
    http.assertDone();
    const form = new URLSearchParams(String(http.calls[0]?.body));
    expect(Object.fromEntries(form)).toEqual({
      grant_type: 'authorization_code',
      code: 'CODE-1',
      client_id: 'client-1',
      client_secret: SECRET,
      redirect_uri: REDIRECT_URI,
      code_verifier: VERIFIER,
    });
    expect(http.calls[1]?.headers.authorization).toBe('Bearer CANARY_access');
    expect(account).toEqual({
      credentials: { accessToken: 'CANARY_access' },
      grantedScopes: ['read:accounts', 'read:statuses', 'write:statuses', 'write:media'],
      providerAccountId: `109876543210@${HOST}`,
      accountKind: 'personal',
      handle: `@alice@${HOST}`,
      displayName: 'Alice A.',
      profileUrl: `${ORIGIN}/@alice`,
      capabilities: {
        instance: {
          maxCharacters: 1000,
          maxMediaAttachments: 4,
          charactersReservedPerUrl: 23,
          supportedMimeTypes: ['image/jpeg', 'image/png'],
          imageSizeLimit: 16_777_216,
          imageMatrixLimit: 33_177_600,
          videoSizeLimit: 103_809_024,
          videoFrameRateLimit: 120,
          videoMatrixLimit: 8_294_400,
          descriptionLimit: 1500,
        },
        fetchedAt: TEST_NOW.toString(),
      },
    });
    expect(mastodonRuntime.parseCredentials(account.credentials)).toEqual(account.credentials);
  });

  it('falls back to the username and omits limits the server does not send', async () => {
    const http = scriptedHttp([token(), me(''), instance()]);
    const account = await finish(http, { code: 'CODE-1' });
    expect(account.displayName).toBe('alice');
    expect(account.capabilities?.instance).not.toHaveProperty('descriptionLimit');
    expect(account.capabilities?.instance).toHaveProperty('maxCharacters', 1000);

    const bare = scriptedHttp([
      token(),
      me(null),
      { url: `${ORIGIN}/api/v2/instance`, json: { configuration: { statuses: 'x' } } },
    ]);
    const old = await finish(bare, { code: 'CODE-1' });
    expect(old.displayName).toBe('alice');
    expect(old.capabilities).toEqual({ instance: {}, fetchedAt: TEST_NOW.toString() });
  });

  it('maps invalid_client to app_config, other refusals to permanent and 5xx to transient', async () => {
    for (const status of [400, 401]) {
      const http = scriptedHttp([token(status, { error: 'invalid_client' })]);
      expect(await failureOf(finish(http, { code: 'c' }))).toEqual({
        kind: 'app_config',
        code: 'invalid_client',
      });
    }
    const grant = scriptedHttp([token(400, { error: 'invalid_grant' })]);
    expect(await failureOf(finish(grant, { code: 'c' }))).toEqual({
      kind: 'permanent',
      code: 'invalid_grant',
    });
    const down = scriptedHttp([token(503, { error: 'unavailable' })]);
    expect(await failureOf(finish(down, { code: 'c' }))).toEqual({
      kind: 'transient',
      detail: 'http_503',
    });
    const instanceDown = scriptedHttp([
      token(),
      me('A'),
      { url: `${ORIGIN}/api/v2/instance`, status: 500 },
    ]);
    expect(await failureOf(finish(instanceDown, { code: 'c' }))).toMatchObject({
      kind: 'transient',
    });
  });

  it('refuses a callback without a code or with an invalid pending state', async () => {
    expect(await failureOf(finish(scriptedHttp([]), {}))).toEqual({
      kind: 'permanent',
      code: 'code_missing',
    });
    const bad = mastodonRuntime.connectFinish(testBaseContext(scriptedHttp([])), {
      app,
      redirectUri: REDIRECT_URI,
      pending: {},
      params: { code: 'c' },
    });
    expect(await failureOf(bad)).toEqual({ kind: 'permanent', code: 'pending_invalid' });
  });
});
