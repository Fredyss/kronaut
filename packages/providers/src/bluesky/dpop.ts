import { createHash, randomUUID } from 'node:crypto';
import type { BaseContext, ProviderHttpResponse, StepEffect } from '@kronaut/core';
import { exportJWK, generateKeyPair, importJWK, SignJWT } from 'jose';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { unexpectedResponse } from '../_kit/failure.ts';
import { send, tryJson } from '../_kit/http.ts';

export const privateEcJwk = z.object({
  kty: z.literal('EC'),
  crv: z.literal('P-256'),
  x: z.string().min(1),
  y: z.string().min(1),
  d: z.string().min(1),
});
export type PrivateEcJwk = z.infer<typeof privateEcJwk>;

export interface PublicEcJwk {
  readonly kty: 'EC';
  readonly crv: 'P-256';
  readonly x: string;
  readonly y: string;
}

export function epochSeconds(now: Temporal.Instant): number {
  return Math.floor(now.epochMilliseconds / 1000);
}

export async function generateDpopKey(): Promise<PrivateEcJwk> {
  const { privateKey } = await generateKeyPair('ES256', { extractable: true });
  return privateEcJwk.parse(await exportJWK(privateKey));
}

export function publicPart(jwk: PrivateEcJwk): PublicEcJwk {
  return { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };
}

export function htu(url: string): string {
  const parsed = new URL(url);
  parsed.search = '';
  parsed.hash = '';
  return parsed.href;
}

export function accessTokenHash(accessToken: string): string {
  return createHash('sha256').update(accessToken).digest('base64url');
}

export interface DpopClaims {
  readonly htm: string;
  readonly url: string;
  readonly nonce?: string;
  readonly accessToken?: string;
}

export async function dpopProof(
  jwk: PrivateEcJwk,
  claims: DpopClaims,
  now: Temporal.Instant,
): Promise<string> {
  const payload = {
    htm: claims.htm,
    htu: htu(claims.url),
    ...(claims.nonce === undefined ? {} : { nonce: claims.nonce }),
    ...(claims.accessToken === undefined ? {} : { ath: accessTokenHash(claims.accessToken) }),
  };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', typ: 'dpop+jwt', jwk: publicPart(jwk) })
    .setJti(randomUUID())
    .setIssuedAt(epochSeconds(now))
    .sign(await importJWK(jwk, 'ES256'));
}

export function errorCode(body: unknown): string | undefined {
  const error: unknown = (body as { error?: unknown } | null | undefined)?.error;
  return typeof error === 'string' ? error : undefined;
}

export function isNonceChallenge(response: ProviderHttpResponse, body: unknown): boolean {
  if (response.status !== 400 && response.status !== 401) return false;
  if (errorCode(body) === 'use_dpop_nonce') return true;
  return /error="use_dpop_nonce"/.test(response.headers.get('www-authenticate') ?? '');
}

export interface ResourceSession {
  readonly accessToken: string;
  readonly dpopJwk: PrivateEcJwk;
  readonly nonce?: string;
}

export interface ResourceRequest {
  readonly method: 'GET' | 'POST';
  readonly url: string;
  readonly contentType?: string;
  readonly body?: string | Uint8Array;
}

export interface ResourceReply {
  readonly response: ProviderHttpResponse;
  readonly body: unknown;
}

export type ResourceClient = (
  effect: StepEffect,
  request: ResourceRequest,
) => Promise<ResourceReply>;

interface ResourceAttempt {
  readonly effect: StepEffect;
  readonly request: ResourceRequest;
  readonly nonce: string | undefined;
}

async function sendResource(
  ctx: BaseContext,
  session: ResourceSession,
  { effect, request, nonce }: ResourceAttempt,
): Promise<ProviderHttpResponse> {
  const proof = await dpopProof(
    session.dpopJwk,
    {
      htm: request.method,
      url: request.url,
      accessToken: session.accessToken,
      ...(nonce === undefined ? {} : { nonce }),
    },
    ctx.now(),
  );
  return send(ctx, effect, request.url, {
    method: request.method,
    headers: {
      accept: 'application/json',
      authorization: `DPoP ${session.accessToken}`,
      dpop: proof,
      ...(request.contentType === undefined ? {} : { 'content-type': request.contentType }),
    },
    ...(request.body === undefined ? {} : { body: request.body }),
  });
}

function freshNonce(response: ProviderHttpResponse): string | undefined {
  const fresh = response.headers.get('dpop-nonce');
  return fresh === null || fresh === '' ? undefined : fresh;
}

function nonceChallenged(
  effect: StepEffect,
  response: ProviderHttpResponse,
  body: unknown,
  fresh: string | undefined,
): boolean {
  if (!isNonceChallenge(response, body)) return false;
  if (fresh === undefined) throw unexpectedResponse(effect);
  return true;
}

export function resourceClient(ctx: BaseContext, session: ResourceSession): ResourceClient {
  let nonce = session.nonce;
  return async (effect, request) => {
    for (let attempt = 0; ; attempt += 1) {
      const response = await sendResource(ctx, session, { effect, request, nonce });
      const fresh = freshNonce(response);
      if (fresh !== undefined) nonce = fresh;
      const body = await tryJson(response);
      if (nonceChallenged(effect, response, body, fresh) && attempt === 0) continue;
      return { response, body };
    }
  };
}
