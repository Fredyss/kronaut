import { randomUUID } from 'node:crypto';
import {
  type BaseContext,
  type ClientSigningKey,
  type Jwk,
  type ProviderApp,
  ProviderFailure,
  type ProviderHttpResponse,
  type StepEffect,
} from '@kronaut/core';
import { importJWK, SignJWT } from 'jose';
import * as z from 'zod';
import { unexpectedResponse } from '../_kit/failure.ts';
import { send, tryJson } from '../_kit/http.ts';
import { dpopProof, epochSeconds, errorCode, isNonceChallenge, type PrivateEcJwk } from './dpop.ts';
import { isSupportedDid, permanent, statusFailure } from './identity.ts';

const ASSERTION_TTL_S = 60;

export const SCOPE = 'atproto transition:generic';
export const CALLBACK_PATH = '/v1/oauth/bluesky/callback';
export const CLIENT_METADATA = 'oauth-client-metadata.json';

const ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
const ERROR_CODE = /^[a-z_]{1,64}$/;
const PUBLIC_JWK_MEMBERS = ['kty', 'crv', 'x', 'y', 'n', 'e', 'kid', 'alg', 'use'] as const;

export function signingKeyOf(app: ProviderApp): ClientSigningKey {
  if (app.signingKey === undefined)
    throw new ProviderFailure({ kind: 'app_config', code: 'signing_key_missing' });
  return app.signingKey;
}

async function clientAssertion(
  ctx: BaseContext,
  app: ProviderApp,
  key: ClientSigningKey,
  issuer: string,
): Promise<string> {
  let privateKey: Awaited<ReturnType<typeof importJWK>>;
  try {
    privateKey = await importJWK({ ...key.privateJwk }, 'ES256');
  } catch (cause) {
    throw new ProviderFailure({ kind: 'app_config', code: 'signing_key_invalid' }, { cause });
  }
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: key.kid })
    .setIssuer(app.clientId)
    .setSubject(app.clientId)
    .setAudience(issuer)
    .setJti(randomUUID())
    .setIssuedAt(epochSeconds(ctx.now()))
    .setExpirationTime(epochSeconds(ctx.now()) + ASSERTION_TTL_S)
    .sign(privateKey);
}

export interface AsSession {
  readonly app: ProviderApp;
  readonly key: ClientSigningKey;
  readonly issuer: string;
  readonly dpopJwk: PrivateEcJwk;
  readonly nonce?: string;
}

export interface AsReply {
  readonly response: ProviderHttpResponse;
  readonly body: unknown;
  readonly nonce?: string;
}

export interface AsRequest {
  readonly url: string;
  readonly fields: Readonly<Record<string, string>>;
}

export async function postToAs(
  ctx: BaseContext,
  effect: StepEffect,
  session: AsSession,
  { url, fields }: AsRequest,
): Promise<AsReply> {
  let nonce = session.nonce;
  for (let attempt = 0; ; attempt += 1) {
    const assertion = await clientAssertion(ctx, session.app, session.key, session.issuer);
    const proof = await dpopProof(
      session.dpopJwk,
      { htm: 'POST', url, ...(nonce === undefined ? {} : { nonce }) },
      ctx.now(),
    );
    const response = await send(ctx, effect, url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        dpop: proof,
      },
      body: new URLSearchParams({
        ...fields,
        client_id: session.app.clientId,
        client_assertion_type: ASSERTION_TYPE,
        client_assertion: assertion,
      }).toString(),
    });
    const fresh = response.headers.get('dpop-nonce');
    if (fresh !== null && fresh !== '') nonce = fresh;
    const body = await tryJson(response);
    if (attempt === 0 && fresh !== null && isNonceChallenge(response, body)) continue;
    return { response, body, ...(nonce === undefined ? {} : { nonce }) };
  }
}

export function successBody<T>(reply: AsReply, schema: z.ZodType<T>, effect: StepEffect): T {
  if (!reply.response.headers.has('dpop-nonce')) throw unexpectedResponse(effect);
  const parsed = schema.safeParse(reply.body);
  if (!parsed.success) throw unexpectedResponse(effect, parsed.error);
  return parsed.data;
}

export function asFailure(reply: AsReply, revokedOnInvalidGrant: boolean): ProviderFailure {
  const { status } = reply.response;
  const raw = errorCode(reply.body);
  const code = raw !== undefined && ERROR_CODE.test(raw) ? raw : 'as_error';
  if (status >= 500 || status === 429) return statusFailure(status, code);
  if (revokedOnInvalidGrant && code === 'invalid_grant')
    return new ProviderFailure({ kind: 'auth_revoked' });
  if (code === 'invalid_client' || code === 'unauthorized_client')
    return new ProviderFailure({ kind: 'app_config', code });
  return permanent(code);
}

export const parResponse = z.looseObject({ request_uri: z.string().min(1) });

export const tokenResponse = z.looseObject({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number().int().positive().optional(),
  refresh_token: z.string().min(1),
  scope: z.string(),
  sub: z.string(),
});
export type TokenResponse = z.infer<typeof tokenResponse>;

export function checkedToken(token: TokenResponse): readonly string[] {
  if (token.token_type.toLowerCase() !== 'dpop') throw permanent('token_type_unsupported');
  const scopes = token.scope.split(' ').filter((scope) => scope !== '');
  if (!scopes.includes('atproto')) throw permanent('scope_missing_atproto');
  if (!isSupportedDid(token.sub)) throw permanent('sub_invalid');
  return scopes;
}

export function callbackUri(publicBaseUrl: string): string {
  return new URL(CALLBACK_PATH, publicBaseUrl).toString();
}

function publicJwk(jwk: Jwk): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const member of PUBLIC_JWK_MEMBERS) if (jwk[member] !== undefined) out[member] = jwk[member];
  return out;
}

export function clientMetadata(app: ProviderApp): Record<string, unknown> {
  return {
    client_id: app.clientId,
    client_name: 'Kronaut',
    client_uri: new URL(app.publicBaseUrl).origin,
    redirect_uris: [callbackUri(app.publicBaseUrl)],
    scope: SCOPE,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'private_key_jwt',
    token_endpoint_auth_signing_alg: 'ES256',
    dpop_bound_access_tokens: true,
    application_type: 'web',
    jwks: { keys: (app.publishedKeys ?? []).map(publicJwk) },
  };
}
