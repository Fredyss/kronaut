import {
  type BaseContext,
  type ClientSigningKey,
  isProviderFailure,
  type Jwk,
  type ProviderApp,
  type ProviderDns,
  type ProviderError,
  type ProviderHttp,
} from '@kronaut/core';
import { exportJWK, generateKeyPair } from 'jose';
import type { ScriptedExchange } from '../_kit/testing.ts';
import { testBaseContext } from '../_kit/testing.ts';

export const HANDLE = 'alice.example.com';
export const DID = 'did:plc:abcdefghijklmnopqrstuvwx';
export const OTHER_DID = 'did:plc:zzzzzzzzzzzzzzzzzzzzzzzz';
export const PDS = 'https://pds.example.net';
export const AS = 'https://auth.example.net';
export const PAR = `${AS}/oauth/par`;
export const TOKEN = `${AS}/oauth/token`;
export const AUTHORIZE = `${AS}/oauth/authorize`;
export const BASE_URL = 'https://kronaut.example.org';
export const CLIENT_ID = `${BASE_URL}/oauth/bluesky/oauth-client-metadata.json`;
export const REDIRECT_URI = `${BASE_URL}/v1/oauth/bluesky/callback`;

export interface TestClientKey {
  readonly signingKey: ClientSigningKey;
  readonly publicJwk: Jwk;
}

export async function clientKey(kid: string): Promise<TestClientKey> {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  return {
    signingKey: { id: `id-${kid}`, kid, alg: 'ES256', privateJwk: await exportJWK(privateKey) },
    publicJwk: { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' },
  };
}

export function testApp(
  signing: TestClientKey | undefined,
  published: readonly Jwk[],
): ProviderApp {
  return {
    clientId: CLIENT_ID,
    publicBaseUrl: BASE_URL,
    publishedKeys: published,
    ...(signing === undefined ? {} : { signingKey: signing.signingKey }),
  };
}

export function fakeDns(records: Readonly<Record<string, readonly string[]>>): ProviderDns {
  return { txt: async (name) => records[name] ?? [] };
}

export function context(http: ProviderHttp, dns: ProviderDns = fakeDns({})): BaseContext {
  return { ...testBaseContext(http), dns };
}

export function didDocument(did = DID, handle = HANDLE, pds = PDS): ScriptedExchange {
  return {
    url: `https://plc.directory/${did}`,
    json: {
      id: did,
      alsoKnownAs: [`at://${handle}`],
      service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: pds }],
    },
  };
}

export function protectedResource(pds = PDS, as = AS): ScriptedExchange {
  return {
    url: `${pds}/.well-known/oauth-protected-resource`,
    json: { resource: pds, authorization_servers: [as] },
  };
}

export function authServer(as = AS, issuer = as): ScriptedExchange {
  return {
    url: `${as}/.well-known/oauth-authorization-server`,
    json: {
      issuer,
      authorization_endpoint: `${as}/oauth/authorize`,
      pushed_authorization_request_endpoint: `${as}/oauth/par`,
      token_endpoint: `${as}/oauth/token`,
      token_endpoint_auth_methods_supported: ['none', 'private_key_jwt'],
      authorization_response_iss_parameter_supported: true,
    },
  };
}

export function nonceChallenge(url: string, nonce: string): ScriptedExchange {
  return {
    method: 'POST',
    url,
    status: 400,
    headers: { 'dpop-nonce': nonce },
    json: { error: 'use_dpop_nonce' },
  };
}

export function tokenGrant(
  nonce: string,
  overrides: Readonly<Record<string, unknown>> = {},
): ScriptedExchange {
  return {
    method: 'POST',
    url: TOKEN,
    headers: { 'dpop-nonce': nonce },
    json: {
      access_token: 'access-1',
      token_type: 'DPoP',
      expires_in: 900,
      refresh_token: 'refresh-2',
      scope: 'atproto transition:generic',
      sub: DID,
      ...overrides,
    },
  };
}

export async function failureOf(promise: Promise<unknown>): Promise<ProviderError> {
  try {
    await promise;
  } catch (error) {
    if (isProviderFailure(error)) return error.error;
    throw error;
  }
  throw new Error('expected a provider failure');
}

export function formOf(body: string | Uint8Array | undefined): URLSearchParams {
  if (typeof body !== 'string') throw new Error('expected a form body');
  return new URLSearchParams(body);
}
