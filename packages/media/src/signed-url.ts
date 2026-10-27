import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto';
import { isStorageKey, STORAGE_KEY_RE } from './storage-key.ts';

export const MEDIA_URL_MAX_TTL_SECONDS = 86_400;

export type MediaRequestVerification =
  | { ok: true; storageKey: string }
  | { ok: false; reason: 'malformed' | 'expired' | 'bad_signature' };

const MIN_SECRET_BYTES = 32;
const SIGNING_KEY_BYTES = 32;
const MAX_EXPIRES_AT = 99_999_999_999;
const PATH_PREFIX = '/m/';
const EXP_RE = /^[1-9][0-9]{0,10}$/;
const SIG_RE = /^[A-Za-z0-9_-]{43}$/;

function assertSigningKey(key: Uint8Array): void {
  if (!(key instanceof Uint8Array) || key.byteLength !== SIGNING_KEY_BYTES) {
    throw new TypeError('media signing key must be 32 bytes');
  }
}

function computeSignature(key: Uint8Array, storageKey: string, expiresAt: number): string {
  return createHmac('sha256', key)
    .update(`v1\n${storageKey}\n${expiresAt}`, 'utf8')
    .digest('base64url');
}

export function deriveMediaSigningKey(masterSecret: Uint8Array): Buffer {
  if (!(masterSecret instanceof Uint8Array) || masterSecret.byteLength < MIN_SECRET_BYTES) {
    throw new TypeError('master secret must be at least 32 bytes');
  }
  return Buffer.from(
    hkdfSync('sha256', masterSecret, new Uint8Array(0), 'kronaut/media-url/v1', SIGNING_KEY_BYTES),
  );
}

export function signMediaPath(key: Uint8Array, storageKey: string, expiresAt: number): string {
  assertSigningKey(key);
  if (!isStorageKey(storageKey)) {
    throw new TypeError('invalid storage key');
  }
  if (!Number.isSafeInteger(expiresAt) || expiresAt < 1 || expiresAt > MAX_EXPIRES_AT) {
    throw new TypeError('expiresAt must be an integer unix timestamp in seconds');
  }
  const sig = computeSignature(key, storageKey, expiresAt);
  return `${PATH_PREFIX}${storageKey}?exp=${expiresAt}&sig=${sig}`;
}

function parseQuery(search: string): { exp: string; sig: string } | null {
  if (!search.startsWith('?')) {
    return null;
  }
  const parts = search.slice(1).split('&');
  if (parts.length !== 2) {
    return null;
  }
  let exp: string | undefined;
  let sig: string | undefined;
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      return null;
    }
    const name = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (name === 'exp' && exp === undefined) {
      exp = value;
    } else if (name === 'sig' && sig === undefined) {
      sig = value;
    } else {
      return null;
    }
  }
  return exp === undefined || sig === undefined ? null : { exp, sig };
}

export function verifyMediaRequest(
  key: Uint8Array,
  pathname: string,
  search: string,
  nowSeconds: number,
): MediaRequestVerification {
  assertSigningKey(key);
  if (!Number.isFinite(nowSeconds)) {
    throw new TypeError('nowSeconds must be a finite number');
  }
  if (!pathname.startsWith(PATH_PREFIX)) {
    return { ok: false, reason: 'malformed' };
  }
  const storageKey = pathname.slice(PATH_PREFIX.length);
  if (!STORAGE_KEY_RE.test(storageKey)) {
    return { ok: false, reason: 'malformed' };
  }
  const query = parseQuery(search);
  if (query === null || !EXP_RE.test(query.exp) || !SIG_RE.test(query.sig)) {
    return { ok: false, reason: 'malformed' };
  }
  const exp = Number(query.exp);
  if (exp - nowSeconds > MEDIA_URL_MAX_TTL_SECONDS) {
    return { ok: false, reason: 'malformed' };
  }
  const expected = Buffer.from(computeSignature(key, storageKey, exp), 'utf8');
  const actual = Buffer.from(query.sig, 'utf8');
  if (expected.byteLength !== actual.byteLength || !timingSafeEqual(expected, actual)) {
    return { ok: false, reason: 'bad_signature' };
  }
  if (nowSeconds > exp) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, storageKey };
}
