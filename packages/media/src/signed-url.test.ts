import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  deriveMediaSigningKey,
  MEDIA_URL_MAX_TTL_SECONDS,
  signMediaPath,
  verifyMediaRequest,
} from './signed-url.ts';

const SECRET = Buffer.alloc(32, 7);
const KEY = deriveMediaSigningKey(SECRET);
const STORAGE_KEY = '0123456789abcdef'.repeat(4);
const OTHER_STORAGE_KEY = 'fedcba9876543210'.repeat(4);
const NOW = 1_800_000_000;
const EXP = NOW + 3600;

function split(url: string): { pathname: string; search: string } {
  const index = url.indexOf('?');
  return { pathname: url.slice(0, index), search: url.slice(index) };
}

function verifyUrl(url: string, now: number = NOW, key: Uint8Array = KEY) {
  const { pathname, search } = split(url);
  return verifyMediaRequest(key, pathname, search, now);
}

function sigOf(url: string): string {
  return new URLSearchParams(split(url).search).get('sig') ?? '';
}

const validUrl = signMediaPath(KEY, STORAGE_KEY, EXP);
const validSig = sigOf(validUrl);

describe('deriveMediaSigningKey', () => {
  it('returns a 32-byte buffer and matches a pinned HKDF vector', () => {
    expect(Buffer.isBuffer(KEY)).toBe(true);
    expect(KEY).toHaveLength(32);
    expect(KEY.toString('hex')).toBe(
      '64935aed502c4ada103f7608b782c2bbc3cfcec4ea817d788618158ec5ccabe2',
    );
  });

  it('is deterministic and secret-dependent', () => {
    expect(deriveMediaSigningKey(SECRET).equals(KEY)).toBe(true);
    expect(deriveMediaSigningKey(Buffer.alloc(32, 8)).equals(KEY)).toBe(false);
    expect(deriveMediaSigningKey(Buffer.alloc(64, 7))).toHaveLength(32);
  });

  it.each([0, 1, 31])('rejects a %d-byte master secret', (length) => {
    expect(() => deriveMediaSigningKey(new Uint8Array(length))).toThrow(TypeError);
  });
});

describe('signMediaPath', () => {
  it('produces /m/<key>?exp=&sig= with an HMAC over the versioned message', () => {
    const expectedSig = createHmac('sha256', KEY)
      .update(`v1\n${STORAGE_KEY}\n${EXP}`, 'utf8')
      .digest('base64url');
    expect(validUrl).toBe(`/m/${STORAGE_KEY}?exp=${EXP}&sig=${expectedSig}`);
    expect(validSig).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('supports keys with an extension', () => {
    const url = signMediaPath(KEY, `${STORAGE_KEY}.jpg`, EXP);
    expect(url.startsWith(`/m/${STORAGE_KEY}.jpg?exp=${EXP}&sig=`)).toBe(true);
    expect(verifyUrl(url)).toEqual({ ok: true, storageKey: `${STORAGE_KEY}.jpg` });
  });

  it('binds the signature to key, storage key and expiry', () => {
    const other = deriveMediaSigningKey(Buffer.alloc(32, 9));
    expect(sigOf(signMediaPath(other, STORAGE_KEY, EXP))).not.toBe(validSig);
    expect(sigOf(signMediaPath(KEY, OTHER_STORAGE_KEY, EXP))).not.toBe(validSig);
    expect(sigOf(signMediaPath(KEY, STORAGE_KEY, EXP + 1))).not.toBe(validSig);
  });

  it.each([0, 31, 33, 64])('rejects a %d-byte signing key', (length) => {
    expect(() => signMediaPath(new Uint8Array(length), STORAGE_KEY, EXP)).toThrow(TypeError);
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 1e12, '1' as unknown as number])(
    'rejects expiresAt %j',
    (expiresAt) => {
      expect(() => signMediaPath(KEY, STORAGE_KEY, expiresAt)).toThrow(TypeError);
    },
  );

  it.each(['', 'a'.repeat(63), 'A'.repeat(64), `${STORAGE_KEY}/`, '../x'])(
    'rejects storage key %j',
    (storageKey) => {
      expect(() => signMediaPath(KEY, storageKey, EXP)).toThrow(TypeError);
    },
  );
});

describe('verifyMediaRequest', () => {
  it('round-trips', () => {
    expect(verifyUrl(validUrl)).toEqual({ ok: true, storageKey: STORAGE_KEY });
  });

  it('accepts exactly at expiry and rejects one second later', () => {
    expect(verifyUrl(validUrl, EXP)).toEqual({ ok: true, storageKey: STORAGE_KEY });
    expect(verifyUrl(validUrl, EXP + 1)).toEqual({ ok: false, reason: 'expired' });
  });

  it('accepts a ttl of exactly the maximum and rejects one second more as malformed', () => {
    const atMax = signMediaPath(KEY, STORAGE_KEY, NOW + MEDIA_URL_MAX_TTL_SECONDS);
    const overMax = signMediaPath(KEY, STORAGE_KEY, NOW + MEDIA_URL_MAX_TTL_SECONDS + 1);
    expect(MEDIA_URL_MAX_TTL_SECONDS).toBe(86_400);
    expect(verifyUrl(atMax).ok).toBe(true);
    expect(verifyUrl(overMax)).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a tampered storage key', () => {
    const { search } = split(validUrl);
    expect(verifyMediaRequest(KEY, `/m/${OTHER_STORAGE_KEY}`, search, NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
    expect(verifyMediaRequest(KEY, `/m/${STORAGE_KEY}.png`, search, NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('rejects a tampered exp', () => {
    const tampered = validUrl.replace(`exp=${EXP}`, `exp=${EXP + 1}`);
    expect(verifyUrl(tampered)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a tampered sig', () => {
    const flipped = `${validSig[0] === 'A' ? 'B' : 'A'}${validSig.slice(1)}`;
    const tampered = validUrl.replace(validSig, flipped);
    expect(verifyUrl(tampered)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a non-canonical encoding of the same mac bytes', () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const last = validSig.slice(-1);
    const index = alphabet.indexOf(last);
    const sibling = alphabet[(index & ~3) | ((index + 1) & 3)] ?? '';
    expect(sibling).not.toBe(last);
    expect(Buffer.from(validSig.slice(0, -1) + sibling, 'base64url')).toEqual(
      Buffer.from(validSig, 'base64url'),
    );
    const tampered = validUrl.replace(validSig, validSig.slice(0, -1) + sibling);
    expect(verifyUrl(tampered)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a url signed with another key', () => {
    const other = deriveMediaSigningKey(Buffer.alloc(32, 9));
    expect(verifyUrl(signMediaPath(other, STORAGE_KEY, EXP))).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('checks the signature before expiry', () => {
    const tampered = validUrl.replace(`exp=${EXP}`, `exp=${EXP - 7200}`);
    expect(verifyUrl(tampered)).toEqual({ ok: false, reason: 'bad_signature' });
    expect(verifyUrl(validUrl, EXP + 10)).toEqual({ ok: false, reason: 'expired' });
  });

  it('checks malformed before the signature', () => {
    const { pathname } = split(validUrl);
    expect(verifyMediaRequest(KEY, pathname, `?exp=${EXP}&sig=${'A'.repeat(42)}`, NOW)).toEqual({
      ok: false,
      reason: 'malformed',
    });
    expect(verifyMediaRequest(KEY, pathname, `?exp=${EXP}&sig=${'A'.repeat(43)}`, NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
  });

  it('throws on an invalid signing key or a non-finite clock', () => {
    const { pathname, search } = split(validUrl);
    expect(() => verifyMediaRequest(new Uint8Array(16), pathname, search, NOW)).toThrow(TypeError);
    expect(() => verifyMediaRequest(KEY, pathname, search, Number.NaN)).toThrow(TypeError);
    expect(() => verifyMediaRequest(KEY, pathname, search, Number.POSITIVE_INFINITY)).toThrow(
      TypeError,
    );
  });

  describe('malformed pathname', () => {
    const { search } = split(validUrl);
    const k = STORAGE_KEY;
    const fullwidth = `０${k.slice(1)}`;

    it.each([
      '',
      '/',
      '/m',
      '/m/',
      '/m/../x',
      '/m/%2e%2e/x',
      '/m/%2E%2E/x',
      `/m/%2e%2e%2f${k}`,
      `/m/${k.slice(0, 2)}%2f${k.slice(2)}`,
      `/m/${k.slice(0, 2)}%2F${k.slice(2)}`,
      `/m/${k.slice(0, 62)}%61%61`,
      `/m/${k}%00`,
      `//m/${k}`,
      `/m//${k}`,
      `/m/${k}/`,
      `/m/./${k}`,
      `/m/x/${k}`,
      `/m/${k.slice(0, 2)}/${k.slice(2)}`,
      `/m/${k.toUpperCase()}`,
      `/m/${k.slice(0, 63)}F`,
      `/m/${k.slice(0, 20)}\\${k.slice(21)}`,
      `/m/..\\${k}`,
      `/m\\${k}`,
      `\\m/${k}`,
      `/m/${k}\\`,
      `/m/${k}\0`,
      `/m/\0${k}`,
      `/m/${k.slice(0, 32)}\0${k.slice(33)}`,
      `/m/${fullwidth}`,
      `/m/${k.slice(0, 63)}`,
      `/m/${k}a`,
      `/m/${k}0`,
      `/m/${k}.`,
      `/m/${k}.a`,
      `/m/${k}.abcdef`,
      `/m/${k}.JPG`,
      `/m/${k}.jpg.png`,
      `/m/${k}.jpg/`,
      `/m/${k}\n`,
      `/m/${k} `,
      `/m/${k}?x=1`,
      `/m/${k}#x`,
      `/M/${k}`,
      `m/${k}`,
      `/x/${k}`,
      `/media/${k}`,
      `http://example.com/m/${k}`,
      `/m/${k}‮`,
      `/m/é${k.slice(1)}`,
    ])('rejects pathname %j', (pathname) => {
      expect(verifyMediaRequest(KEY, pathname, search, NOW)).toEqual({
        ok: false,
        reason: 'malformed',
      });
    });
  });

  describe('malformed search', () => {
    const { pathname } = split(validUrl);
    const exp = String(EXP);

    it.each([
      ['empty', ''],
      ['bare question mark', '?'],
      ['no question mark', `exp=${exp}&sig=${validSig}`],
      ['double question mark', `??exp=${exp}&sig=${validSig}`],
      ['missing sig', `?exp=${exp}`],
      ['missing exp', `?sig=${validSig}`],
      ['duplicate exp', `?exp=${exp}&exp=${exp}&sig=${validSig}`],
      ['duplicate sig', `?exp=${exp}&sig=${validSig}&sig=${validSig}`],
      ['duplicate exp without sig', `?exp=${exp}&exp=${exp}`],
      ['duplicate sig without exp', `?sig=${validSig}&sig=${validSig}`],
      ['extra param', `?exp=${exp}&sig=${validSig}&x=1`],
      ['extra param first', `?x=1&exp=${exp}&sig=${validSig}`],
      ['trailing ampersand', `?exp=${exp}&sig=${validSig}&`],
      ['leading ampersand', `?&exp=${exp}&sig=${validSig}`],
      ['semicolon separator', `?exp=${exp};sig=${validSig}`],
      ['part without equals', `?exp${exp}&sig=${validSig}`],
      ['uppercase names', `?EXP=${exp}&SIG=${validSig}`],
      ['encoded name', `?ex%70=${exp}&sig=${validSig}`],
      ['encoded exp value', `?exp=%31${exp.slice(1)}&sig=${validSig}`],
      ['plus-prefixed exp', `?exp=+${exp}&sig=${validSig}`],
      ['+123 exp', `?exp=+123&sig=${validSig}`],
      ['zero-prefixed exp', `?exp=0${exp}&sig=${validSig}`],
      ['0123 exp', `?exp=0123&sig=${validSig}`],
      ['zero exp', `?exp=0&sig=${validSig}`],
      ['empty exp', `?exp=&sig=${validSig}`],
      ['negative exp', `?exp=-${exp}&sig=${validSig}`],
      ['decimal exp', `?exp=${exp}.5&sig=${validSig}`],
      ['exponent exp', `?exp=1e9&sig=${validSig}`],
      ['hex exp', `?exp=0x10&sig=${validSig}`],
      ['space-prefixed exp', `?exp=%20${exp}&sig=${validSig}`],
      ['literal space exp', `?exp= ${exp}&sig=${validSig}`],
      ['trailing newline exp', `?exp=${exp}\n&sig=${validSig}`],
      ['twelve digit exp', `?exp=100000000000&sig=${validSig}`],
      ['fullwidth digit exp', `?exp=１８００００００００&sig=${validSig}`],
      ['arabic-indic digit exp', `?exp=١٨٠٠٠٠٠٠٠٠&sig=${validSig}`],
      ['exp with extra equals', `?exp=${exp}=&sig=${validSig}`],
      ['padded sig', `?exp=${exp}&sig=${validSig}=`],
      ['padded short sig', `?exp=${exp}&sig=${validSig.slice(0, 42)}=`],
      ['short sig', `?exp=${exp}&sig=${validSig.slice(0, 42)}`],
      ['long sig', `?exp=${exp}&sig=${validSig}A`],
      ['empty sig', `?exp=${exp}&sig=`],
      ['standard base64 plus in sig', `?exp=${exp}&sig=${validSig.slice(0, 42)}+`],
      ['standard base64 slash in sig', `?exp=${exp}&sig=${validSig.slice(0, 42)}/`],
      ['encoded char in sig', `?exp=${exp}&sig=${validSig.slice(0, 40)}%41`],
      ['newline in sig', `?exp=${exp}&sig=${validSig.slice(0, 42)}\n`],
      ['fullwidth char in sig', `?exp=${exp}&sig=${validSig.slice(0, 42)}Ａ`],
      ['fragment', `?exp=${exp}&sig=${validSig}#x`],
    ])('rejects %s', (_label, search) => {
      expect(verifyMediaRequest(KEY, pathname, search, NOW)).toEqual({
        ok: false,
        reason: 'malformed',
      });
    });

    it('accepts either param order', () => {
      expect(verifyMediaRequest(KEY, pathname, `?sig=${validSig}&exp=${exp}`, NOW)).toEqual({
        ok: true,
        storageKey: STORAGE_KEY,
      });
    });
  });
});
