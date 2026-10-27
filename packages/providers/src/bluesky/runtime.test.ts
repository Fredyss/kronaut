import { createHash } from 'node:crypto';
import type { Jwk, ProviderApp } from '@kronaut/core';
import { decodeProtectedHeader, importJWK, type JWK, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';
import { onlyAccount, type RecordedRequest, scriptedHttp, TEST_NOW } from '../_kit/testing.ts';
import { generateDpopKey } from './dpop.ts';
import { type BlueskyCredentials, blueskyRuntime } from './runtime.ts';
import {
  AS,
  AUTHORIZE,
  authServer,
  BASE_URL,
  CLIENT_ID,
  clientKey,
  context,
  DID,
  didDocument,
  failureOf,
  fakeDns,
  formOf,
  HANDLE,
  nonceChallenge,
  OTHER_DID,
  PAR,
  PDS,
  protectedResource,
  REDIRECT_URI,
  TOKEN,
  testApp,
  tokenGrant,
} from './testing.ts';

const active = await clientKey('k-active');
const retiring = await clientKey('k-retiring');
const published = [active.publicJwk, retiring.publicJwk];

function refresh(...args: Parameters<NonNullable<typeof blueskyRuntime.refresh>>) {
  if (blueskyRuntime.refresh === undefined) throw new Error('bluesky refreshes');
  return blueskyRuntime.refresh(...args);
}

async function verifyAssertion(request: RecordedRequest | undefined, publicJwk: Jwk) {
  const assertion = formOf(request?.body).get('client_assertion') ?? '';
  const { payload, protectedHeader } = await jwtVerify(
    assertion,
    await importJWK(publicJwk as JWK, 'ES256'),
    {
      issuer: CLIENT_ID,
      subject: CLIENT_ID,
      audience: AS,
      currentDate: new Date(TEST_NOW.epochMilliseconds),
    },
  );
  expect(typeof payload.jti).toBe('string');
  expect(payload.iat).toBe(TEST_NOW.epochMilliseconds / 1000);
  expect(payload.exp).toBe(TEST_NOW.epochMilliseconds / 1000 + 60);
  return protectedHeader;
}

async function verifyDpop(request: RecordedRequest | undefined) {
  const proof = request?.headers.dpop ?? '';
  const header = decodeProtectedHeader(proof);
  expect(header).toMatchObject({ typ: 'dpop+jwt', alg: 'ES256' });
  expect(header.jwk).not.toHaveProperty('d');
  const { payload } = await jwtVerify(proof, await importJWK(header.jwk as JWK, 'ES256'), {
    typ: 'dpop+jwt',
  });
  return { header, payload };
}

async function pending(expectedDid?: string) {
  return {
    verifier: 'verifier-1',
    dpopJwk: await generateDpopKey(),
    issuer: AS,
    tokenEndpoint: TOKEN,
    asNonce: 'n0',
    ...(expectedDid === undefined ? {} : { expectedDid, pds: PDS, handle: HANDLE }),
  };
}

const profileExchanges = (displayName?: string) => [
  {
    url: `${PDS}/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(DID)}`,
    json: { handle: HANDLE, did: DID, handleIsCorrect: true },
  },
  displayName === undefined
    ? {
        url: `${PDS}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(DID)}&collection=app.bsky.actor.profile&rkey=self`,
        status: 400,
        json: { error: 'RecordNotFound' },
      }
    : {
        url: `${PDS}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(DID)}&collection=app.bsky.actor.profile&rkey=self`,
        json: { value: { displayName } },
      },
];

async function storedCredentials(): Promise<BlueskyCredentials> {
  return {
    did: DID,
    pds: PDS,
    issuer: AS,
    tokenEndpoint: TOKEN,
    accessToken: 'access-0',
    refreshToken: 'refresh-1',
    dpopJwk: await generateDpopKey(),
    asNonce: 'stale',
  };
}

describe('bluesky connect', () => {
  it('sends PAR with a client assertion, PKCE S256, login_hint and DPoP, retrying once on use_dpop_nonce', async () => {
    const http = scriptedHttp([
      { url: `https://${HANDLE}/.well-known/atproto-did`, status: 404 },
      didDocument(),
      protectedResource(),
      authServer(),
      nonceChallenge(PAR, 'n1'),
      {
        method: 'POST',
        url: PAR,
        status: 201,
        headers: { 'dpop-nonce': 'n2' },
        json: { request_uri: 'urn:ietf:params:oauth:request_uri:req-1', expires_in: 60 },
      },
    ]);
    const ctx = context(http, fakeDns({ [`_atproto.${HANDLE}`]: [`did=${DID}`] }));
    const started = await blueskyRuntime.connectStart(ctx, {
      app: testApp(active, published),
      redirectUri: REDIRECT_URI,
      state: 'state-1',
      loginHint: HANDLE,
    });
    http.assertDone();

    const [first, second] = http.calls.slice(-2);
    expect((await verifyAssertion(second, active.publicJwk)).kid).toBe('k-active');
    const form = formOf(second?.body);
    const verifier = String(started.pending.verifier);
    expect(Object.fromEntries(form)).toMatchObject({
      client_id: CLIENT_ID,
      response_type: 'code',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      state: 'state-1',
      redirect_uri: REDIRECT_URI,
      scope: 'atproto transition:generic',
      login_hint: HANDLE,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    });
    const firstProof = await verifyDpop(first);
    const secondProof = await verifyDpop(second);
    expect(firstProof.payload).toMatchObject({ htm: 'POST', htu: PAR });
    expect(firstProof.payload).not.toHaveProperty('nonce');
    expect(secondProof.payload).toMatchObject({ htm: 'POST', htu: PAR, nonce: 'n1' });
    expect(secondProof.header.jwk).toEqual(firstProof.header.jwk);

    const url = new URL(started.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(AUTHORIZE);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: CLIENT_ID,
      request_uri: 'urn:ietf:params:oauth:request_uri:req-1',
    });
    expect(started.pending).toMatchObject({ issuer: AS, expectedDid: DID, asNonce: 'n2' });
  });

  it('rejects a wrong iss before any token call and a sub other than the expected DID', async () => {
    const app = testApp(active, published);
    const silent = scriptedHttp([]);
    const wrongIss = blueskyRuntime.connectFinish(context(silent), {
      app,
      redirectUri: REDIRECT_URI,
      pending: await pending(DID),
      params: { state: 'state-1', iss: 'https://evil.example', code: 'code-1' },
    });
    expect(await failureOf(wrongIss)).toEqual({ kind: 'permanent', code: 'issuer_mismatch' });
    expect(silent.calls).toHaveLength(0);

    const http = scriptedHttp([tokenGrant('n1', { sub: OTHER_DID })]);
    const wrongSub = blueskyRuntime.connectFinish(context(http), {
      app,
      redirectUri: REDIRECT_URI,
      pending: await pending(DID),
      params: { state: 'state-1', iss: AS, code: 'code-1' },
    });
    expect(await failureOf(wrongSub)).toEqual({ kind: 'permanent', code: 'sub_mismatch' });
    http.assertDone();
  });

  it('exchanges the code for credentials with their own DPoP key, with or without expires_in', async () => {
    const app = testApp(active, published);
    const state = await pending(DID);
    const http = scriptedHttp([tokenGrant('n1'), ...profileExchanges('Alice')]);
    const account = onlyAccount(
      await blueskyRuntime.connectFinish(context(http), {
        app,
        redirectUri: REDIRECT_URI,
        pending: state,
        params: { state: 'state-1', iss: AS, code: 'code-1' },
      }),
    );
    http.assertDone();
    expect(Object.fromEntries(formOf(http.calls[0]?.body))).toMatchObject({
      grant_type: 'authorization_code',
      code: 'code-1',
      redirect_uri: REDIRECT_URI,
      code_verifier: 'verifier-1',
    });
    expect((await verifyDpop(http.calls[0])).payload).toMatchObject({ htu: TOKEN, nonce: 'n0' });
    expect(account).toMatchObject({
      providerAccountId: DID,
      accountKind: 'profile',
      handle: HANDLE,
      displayName: 'Alice',
      profileUrl: `https://bsky.app/profile/${DID}`,
      grantedScopes: ['atproto', 'transition:generic'],
      accessExpiresAt: TEST_NOW.add({ seconds: 900 }),
    });
    const credentials = blueskyRuntime.parseCredentials(
      JSON.parse(JSON.stringify(account.credentials)),
    );
    expect(credentials).toMatchObject({
      did: DID,
      pds: PDS,
      issuer: AS,
      tokenEndpoint: TOKEN,
      accessToken: 'access-1',
      refreshToken: 'refresh-2',
      asNonce: 'n1',
    });
    expect(credentials.dpopJwk).toEqual(state.dpopJwk);
    expect(credentials.dpopJwk.x).not.toBe(active.signingKey.privateJwk.x);

    const noExpiry = scriptedHttp([
      tokenGrant('n1', { expires_in: undefined }),
      ...profileExchanges(),
    ]);
    const lasting = onlyAccount(
      await blueskyRuntime.connectFinish(context(noExpiry), {
        app,
        redirectUri: REDIRECT_URI,
        pending: await pending(DID),
        params: { state: 'state-1', iss: AS, code: 'code-1' },
      }),
    );
    expect(lasting).not.toHaveProperty('accessExpiresAt');
    expect(lasting.displayName).toBe(HANDLE);
  });
});

describe('bluesky refresh', () => {
  it('signs with the bound key only and retries once on use_dpop_nonce', async () => {
    const http = scriptedHttp([
      didDocument(),
      protectedResource(),
      authServer(),
      nonceChallenge(TOKEN, 'n4'),
      tokenGrant('n5', { access_token: 'access-2', refresh_token: 'refresh-3' }),
    ]);
    const stored = await storedCredentials();
    const issued = await refresh(context(http), {
      app: testApp(retiring, published),
      account: { providerAccountId: DID },
      credentials: stored,
    });
    http.assertDone();
    const [first, second] = http.calls.slice(-2);
    for (const request of [first, second])
      expect((await verifyAssertion(request, retiring.publicJwk)).kid).toBe('k-retiring');
    expect(Object.fromEntries(formOf(second?.body))).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: 'refresh-1',
    });
    expect((await verifyDpop(first)).payload).toMatchObject({ htu: TOKEN, nonce: 'stale' });
    expect((await verifyDpop(second)).payload).toMatchObject({ htu: TOKEN, nonce: 'n4' });
    expect(issued.credentials).toMatchObject({
      accessToken: 'access-2',
      refreshToken: 'refresh-3',
      asNonce: 'n5',
      dpopJwk: stored.dpopJwk,
    });
  });

  it('maps invalid_grant to auth_revoked and refuses a moved AS or a missing key before refreshing', async () => {
    const input = async (app: ProviderApp) => ({
      app,
      account: { providerAccountId: DID },
      credentials: await storedCredentials(),
    });
    const revoked = scriptedHttp([
      didDocument(),
      protectedResource(),
      authServer(),
      { method: 'POST', url: TOKEN, status: 400, json: { error: 'invalid_grant' } },
    ]);
    const app = testApp(active, published);
    expect(await failureOf(refresh(context(revoked), await input(app)))).toEqual({
      kind: 'auth_revoked',
    });

    const dropped = scriptedHttp([
      didDocument(),
      protectedResource(),
      authServer(),
      { method: 'POST', url: TOKEN, error: new Error('socket hang up') },
    ]);
    expect((await failureOf(refresh(context(dropped), await input(app)))).kind).toBe('ambiguous');

    const garbled = scriptedHttp([
      didDocument(),
      protectedResource(),
      authServer(),
      { method: 'POST', url: TOKEN, status: 200, text: 'not json' },
    ]);
    expect((await failureOf(refresh(context(garbled), await input(app)))).kind).toBe('ambiguous');

    const moved = scriptedHttp([
      didDocument(),
      protectedResource(PDS, 'https://other-auth.example'),
      authServer('https://other-auth.example'),
    ]);
    expect(await failureOf(refresh(context(moved), await input(app)))).toEqual({
      kind: 'auth_revoked',
    });
    moved.assertDone();
    expect(moved.calls.some((call) => call.method === 'POST')).toBe(false);

    const unkeyed = scriptedHttp([]);
    expect(
      await failureOf(refresh(context(unkeyed), await input(testApp(undefined, published)))),
    ).toEqual({ kind: 'app_config', code: 'signing_key_missing' });
    expect(unkeyed.calls).toHaveLength(0);
  });
});

describe('bluesky client metadata', () => {
  it('publishes the facts-file document with public keys only', () => {
    const app = {
      ...testApp(undefined, published),
      get signingKey(): never {
        throw new Error('publicDocuments must not read the signing key');
      },
    };
    const documents = blueskyRuntime.publicDocuments?.(app) ?? {};
    expect(documents).toEqual({
      'oauth-client-metadata.json': {
        client_id: CLIENT_ID,
        client_name: 'Kronaut',
        client_uri: BASE_URL,
        redirect_uris: [REDIRECT_URI],
        scope: 'atproto transition:generic',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'private_key_jwt',
        token_endpoint_auth_signing_alg: 'ES256',
        dpop_bound_access_tokens: true,
        application_type: 'web',
        jwks: { keys: published },
      },
    });
    expect(JSON.stringify(documents)).not.toMatch(/"d"\s*:/);
  });
});
