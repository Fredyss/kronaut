import type { EgressResponse, HttpClient } from '@kronaut/egress';
import { exportJWK, generateKeyPair, type JWK, SignJWT } from 'jose';
import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootAccess } from '../start.ts';
import { type AccessVerifier, createAccessVerifier } from './access.ts';

const AUD = 'aud-0123456789abcdef';
const TEAM = 'kronaut-test.cloudflareaccess.com';
const ISS = `https://${TEAM}`;
const NOW = Temporal.Instant.from('2026-10-21T10:00:00Z');
const NOW_S = NOW.epochMilliseconds / 1000;

type KeyPair = Awaited<ReturnType<typeof generateKeyPair>>;

interface Signer {
  readonly kid: string;
  readonly pair: KeyPair;
  readonly jwk: JWK;
}

async function signer(kid: string): Promise<Signer> {
  const pair = await generateKeyPair('RS256', { extractable: true });
  return {
    kid,
    pair,
    jwk: { ...(await exportJWK(pair.publicKey)), kid, alg: 'RS256', use: 'sig' },
  };
}

const issued: string[] = [];
const lines: string[] = [];
const logger = pino({ level: 'debug' }, { write: (line: string) => lines.push(line) });

async function token(
  key: Signer,
  claims: { aud?: string; iss?: string; exp?: number; nbf?: number } = {},
  kid = key.kid,
): Promise<string> {
  const jwt = new SignJWT({ email: 'owner@example.test' })
    .setProtectedHeader({ alg: 'RS256', kid })
    .setAudience(claims.aud ?? AUD)
    .setIssuer(claims.iss ?? ISS)
    .setIssuedAt(NOW_S - 10)
    .setExpirationTime(claims.exp ?? NOW_S + 300);
  if (claims.nbf !== undefined) jwt.setNotBefore(claims.nbf);
  const value = await jwt.sign(key.pair.privateKey);
  issued.push(value);
  return value;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

interface Served {
  status: number;
  body: unknown;
}

function certsServer(initial: Served | Error) {
  const state = { serve: initial, calls: 0 };
  const http: HttpClient = {
    async request(url): Promise<EgressResponse> {
      expect(String(url)).toBe(`${ISS}/cdn-cgi/access/certs`);
      state.calls += 1;
      const current = state.serve;
      if (current instanceof Error) throw current;
      const raw = new TextEncoder().encode(JSON.stringify(current.body));
      return {
        status: current.status,
        headers: new Headers(),
        url: String(url),
        redirected: false,
        bytes: async () => raw,
        text: async () => new TextDecoder().decode(raw),
        json: async () => current.body,
      };
    },
    fetch: () => Promise.reject(new Error('fetch is not used')),
  };
  return { http, state };
}

function jwks(...keys: Signer[]): Served {
  return { status: 200, body: { keys: keys.map((key) => key.jwk) } };
}

const verifiers: AccessVerifier[] = [];

function verifier(http: HttpClient, now: () => Temporal.Instant = () => NOW): AccessVerifier {
  const created = createAccessVerifier({ aud: AUD, teamDomain: TEAM, http, logger, now });
  verifiers.push(created);
  return created;
}

afterEach(() => {
  for (const created of verifiers.splice(0)) created.stop();
  vi.useRealTimers();
});

describe('Cloudflare Access verifier', () => {
  it('accepts a valid RS256 token', async () => {
    const key = await signer('k1');
    const { http } = certsServer(jwks(key));
    const access = verifier(http);
    await access.refresh();
    expect(await access.verify(await token(key))).toEqual({ ok: true });
  });

  it('rejects bad tokens with a reason', async () => {
    const key = await signer('k1');
    const other = await signer('k1');
    const { http } = certsServer(jwks(key));
    const access = verifier(http);
    await access.refresh();
    const header = encode({ alg: 'RS256', kid: 'k1' });
    const payload = encode({ aud: AUD, iss: ISS, exp: NOW_S + 300 });
    const hs256 = `${encode({ alg: 'HS256', kid: 'k1' })}.${payload}.${encode('sig')}`;
    const none = `${encode({ alg: 'none', kid: 'k1' })}.${payload}.`;
    const cases: [string | null, string][] = [
      [null, 'missing'],
      ['', 'missing'],
      [await token(key, { aud: 'another-aud' }), 'audience'],
      [await token(key, { iss: 'https://other.cloudflareaccess.com' }), 'issuer'],
      [await token(key, { exp: NOW_S - 61 }), 'expired'],
      [await token(key, { nbf: NOW_S + 61 }), 'not_yet_valid'],
      [hs256, 'algorithm'],
      [none, 'algorithm'],
      [await token(other), 'signature'],
      ['not-a-jwt', 'malformed'],
      [`${header}.${encode('x')}`, 'malformed'],
    ];
    for (const [value, reason] of cases) {
      expect(await access.verify(value), reason).toEqual({ ok: false, reason });
    }
    expect(await access.verify(await token(key, { exp: NOW_S - 59 }))).toEqual({ ok: true });
  });

  it('refetches once on an unknown kid and at most once per minute', async () => {
    const first = await signer('k1');
    const rotated = await signer('k2');
    const stranger = await signer('k3');
    const { http, state } = certsServer(jwks(first));
    let now = NOW;
    const access = verifier(http, () => now);
    await access.refresh();
    state.serve = jwks(first, rotated);
    expect(await access.verify(await token(rotated))).toEqual({ ok: true });
    expect(state.calls).toBe(2);
    now = NOW.add({ seconds: 59 });
    expect(await access.verify(await token(stranger))).toEqual({
      ok: false,
      reason: 'unknown_kid',
    });
    expect(state.calls).toBe(2);
  });

  it('keeps the last good keys when the hourly refetch fails', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const key = await signer('k1');
    const { http, state } = certsServer(jwks(key));
    const access = verifier(http);
    await access.refresh();
    state.serve = new Error('connection reset');
    const before = lines.length;
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(state.calls).toBe(2);
    expect(lines.slice(before).some((line) => line.includes('"level":40'))).toBe(true);
    expect(await access.verify(await token(key))).toEqual({ ok: true });
  });

  it('fails refresh without a usable key set', async () => {
    const key = await signer('k1');
    const invalid: (Served | Error)[] = [
      new Error('dns failure'),
      { status: 500, body: jwks(key).body },
      { status: 200, body: { keys: 'none' } },
      { status: 200, body: { keys: [] } },
      { status: 200, body: { keys: [{}] } },
      { status: 200, body: { keys: [{ kty: 'RSA', kid: 'k1' }] } },
      { status: 200, body: { keys: [{ kty: 'oct', k: 'c2VjcmV0', kid: 'k1' }] } },
      { status: 200, body: { keys: [{ ...key.jwk, alg: 'HS256' }] } },
      { status: 200, body: { keys: [], pad: 'x'.repeat(64 * 1024) } },
    ];
    for (const serve of invalid) {
      const { http } = certsServer(serve);
      const access = verifier(http);
      await expect(access.refresh()).rejects.toThrow();
      expect(await access.verify(await token(key))).toEqual({ ok: false, reason: 'no_keys' });
    }
  });

  it('never lets an older refresh replace a newer key set', async () => {
    const old = await signer('k1');
    const rotated = await signer('k2');
    const replies: ((served: Served) => void)[] = [];
    const http: HttpClient = {
      request: (url) =>
        new Promise<EgressResponse>((resolve) => {
          replies.push((served) => {
            const raw = new TextEncoder().encode(JSON.stringify(served.body));
            resolve({
              status: served.status,
              headers: new Headers(),
              url: String(url),
              redirected: false,
              bytes: async () => raw,
              text: async () => new TextDecoder().decode(raw),
              json: async () => served.body,
            });
          });
        }),
      fetch: () => Promise.reject(new Error('fetch is not used')),
    };
    const access = verifier(http);
    const older = access.refresh();
    const newer = access.refresh();
    replies[1]?.(jwks(rotated));
    await newer;
    replies[0]?.(jwks(old));
    await older;
    expect(await access.verify(await token(rotated))).toEqual({ ok: true });
  });

  it('makes boot fail when the first key fetch fails', async () => {
    const { http } = certsServer(new Error('dns failure'));
    await expect(
      bootAccess({ aud: AUD, teamDomain: TEAM }, logger, () => NOW, http),
    ).rejects.toThrow('dns failure');
  });

  it('never logs a token', () => {
    expect(issued.length).toBeGreaterThan(0);
    for (const value of issued) {
      expect(lines.some((line) => line.includes(value))).toBe(false);
    }
  });
});
