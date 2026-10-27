import type { HttpClient } from '@kronaut/egress';
import { createLocalJWKSet, errors, importJWK, type JWK, jwtVerify } from 'jose';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';

export const ACCESS_HEADER = 'cf-access-jwt-assertion';

export const ACCESS_EGRESS = {
  maxResponseBytes: 64 * 1024,
  timeoutMs: 10_000,
  maxRedirects: 0,
} as const;

const REFRESH_MS = 60 * 60 * 1000;
const KID_REFETCH_MS = 60_000;
const CLOCK_TOLERANCE_S = 60;

export type AccessReason =
  | 'missing'
  | 'malformed'
  | 'algorithm'
  | 'signature'
  | 'audience'
  | 'issuer'
  | 'expired'
  | 'not_yet_valid'
  | 'claims'
  | 'unknown_kid'
  | 'no_keys'
  | 'invalid';

export type AccessResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: AccessReason };

export interface AccessGate {
  verify(token: string | null): Promise<AccessResult>;
}

export interface AccessVerifier extends AccessGate {
  refresh(): Promise<void>;
  stop(): void;
}

export interface AccessVerifierOptions {
  readonly aud: string;
  readonly teamDomain: string;
  readonly http: HttpClient;
  readonly logger: Logger;
  now(): Temporal.Instant;
}

const JwksSchema = z.object({ keys: z.array(z.record(z.string(), z.unknown())).min(1) });
const DECODER = new TextDecoder('utf-8', { fatal: true });
const OK: AccessResult = { ok: true };

function fail(reason: AccessReason): AccessResult {
  return { ok: false, reason };
}

async function usableKeys(candidates: readonly Record<string, unknown>[]): Promise<JWK[]> {
  const usable: JWK[] = [];
  for (const candidate of candidates) {
    const jwk = candidate as JWK;
    if (jwk.kty !== 'RSA') continue;
    if (jwk.alg !== undefined && jwk.alg !== 'RS256') continue;
    if (jwk.use !== undefined && jwk.use !== 'sig') continue;
    try {
      await importJWK(jwk, 'RS256');
    } catch {
      continue;
    }
    usable.push(jwk);
  }
  return usable;
}

function reasonOf(err: unknown): AccessReason {
  if (err instanceof errors.JWTExpired) return 'expired';
  if (err instanceof errors.JWTClaimValidationFailed) {
    switch (err.claim) {
      case 'aud':
        return 'audience';
      case 'iss':
        return 'issuer';
      case 'exp':
        return 'expired';
      case 'nbf':
        return 'not_yet_valid';
      default:
        return 'claims';
    }
  }
  if (err instanceof errors.JWSSignatureVerificationFailed) return 'signature';
  if (err instanceof errors.JWKSNoMatchingKey) return 'unknown_kid';
  if (err instanceof errors.JOSEAlgNotAllowed) return 'algorithm';
  if (err instanceof errors.JWSInvalid || err instanceof errors.JWTInvalid) return 'malformed';
  return 'invalid';
}

async function fetchKeys(http: HttpClient, certsUrl: string): Promise<JWK[]> {
  const response = await http.request(certsUrl, { headers: { accept: 'application/json' } });
  const raw = await response.bytes();
  if (response.status !== 200) {
    throw new Error(`Access certs request failed with status ${response.status}`);
  }
  if (raw.byteLength > ACCESS_EGRESS.maxResponseBytes) {
    throw new Error('Access certs response is too large');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(DECODER.decode(raw));
  } catch {
    throw new Error('Access certs response is not valid JSON');
  }
  const jwks = JwksSchema.safeParse(parsed);
  if (!jwks.success) throw new Error('Access certs response has no keys array');
  const usable = await usableKeys(jwks.data.keys);
  if (usable.length === 0) throw new Error('Access certs response has no usable RS256 key');
  return usable;
}

interface Expected {
  readonly aud: string;
  readonly issuer: string;
  now(): Temporal.Instant;
}

async function verifyWith(
  keys: ReturnType<typeof createLocalJWKSet>,
  token: string,
  expected: Expected,
): Promise<AccessResult> {
  try {
    await jwtVerify(token, keys, {
      algorithms: ['RS256'],
      audience: expected.aud,
      issuer: expected.issuer,
      clockTolerance: CLOCK_TOLERANCE_S,
      requiredClaims: ['exp'],
      currentDate: new Date(expected.now().epochMilliseconds),
    });
    return OK;
  } catch (err) {
    return fail(reasonOf(err));
  }
}

export function createAccessVerifier(options: AccessVerifierOptions): AccessVerifier {
  const { aud, teamDomain, http, logger, now } = options;
  const certsUrl = `https://${teamDomain}/cdn-cgi/access/certs`;
  const issuer = `https://${teamDomain}`;
  let keys: ReturnType<typeof createLocalJWKSet> | null = null;
  let lastKidRefetch = Number.NEGATIVE_INFINITY;
  let pending: Promise<boolean> | null = null;
  let started = 0;
  let applied = 0;

  const refresh = async (): Promise<void> => {
    started += 1;
    const generation = started;
    const usable = await fetchKeys(http, certsUrl);
    if (generation < applied) return;
    applied = generation;
    keys = createLocalJWKSet({ keys: usable });
  };

  const background = (): Promise<boolean> =>
    refresh().then(
      () => true,
      (err: unknown) => {
        logger.warn({ err }, 'Access key refresh failed; keeping the last good keys');
        return false;
      },
    );

  const refetchForKid = (): Promise<boolean> => {
    if (pending !== null) return pending;
    const at = now().epochMilliseconds;
    if (at - lastKidRefetch < KID_REFETCH_MS) return Promise.resolve(false);
    lastKidRefetch = at;
    pending = background().finally(() => {
      pending = null;
    });
    return pending;
  };

  const attempt = async (token: string): Promise<AccessResult> => {
    if (keys === null) return fail('no_keys');
    return verifyWith(keys, token, { aud, issuer, now });
  };

  const timer = setInterval(() => {
    void background();
  }, REFRESH_MS);
  timer.unref();

  return {
    async verify(token) {
      if (token === null || token === '') return fail('missing');
      const first = await attempt(token);
      if (first.ok || first.reason !== 'unknown_kid') return first;
      if (!(await refetchForKid())) return first;
      return attempt(token);
    },
    refresh,
    stop() {
      clearInterval(timer);
    },
  };
}
