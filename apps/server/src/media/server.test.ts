import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalStore, type MediaStore, signMediaPath, storageKey } from '@kronaut/media';
import type { Hono } from 'hono';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMediaServer } from './server.ts';
import { jpegFixture, pngFixture } from './testing.ts';

const NOW = 1_800_000_000;
const ORIGIN = 'http://media.test';

let root: string;
let store: MediaStore;
let app: Hono;
let jpegKey: string;
let pngKey: string;
let mp4Key: string;
const key = randomBytes(32);
const jpeg = jpegFixture({ width: 4, height: 4 });
const png = pngFixture();
const mp4 = Uint8Array.from({ length: 8192 }, (_, index) => index % 251);
mp4.set([0, 0, 0, 0x18, ...new TextEncoder().encode('ftypisom')]);

function keyFor(data: Uint8Array): string {
  return storageKey(randomUUID(), createHash('sha256').update(data).digest());
}

function signed(storage: string, exp = NOW + 600): string {
  return `${ORIGIN}${signMediaPath(key, storage, exp)}`;
}

async function expectBareNotFound(response: Response): Promise<void> {
  expect(response.status).toBe(404);
  expect(response.headers.get('content-type')).toBeNull();
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  expect(await response.text()).toBe('');
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'kronaut-media-server-'));
  store = createLocalStore(root);
  jpegKey = keyFor(jpeg);
  pngKey = keyFor(png);
  await store.put(jpegKey, jpeg);
  await store.put(pngKey, png);
  mp4Key = keyFor(mp4);
  await store.put(mp4Key, mp4);
  app = createMediaServer({
    store,
    signingKey: key,
    clock: () => Temporal.Instant.fromEpochMilliseconds(NOW * 1000),
  });
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('createMediaServer', () => {
  it('serves a signed object with locked-down headers', async () => {
    const response = await app.request(signed(jpegKey));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('content-length')).toBe(String(jpeg.byteLength));
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
    expect(response.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
    expect(response.headers.get('cache-control')).toBe('private, max-age=600');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(jpeg);
  });

  it('takes the content type from the stored bytes', async () => {
    const response = await app.request(signed(pngKey));
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(png);
  });

  it('answers HEAD with headers and no body', async () => {
    const response = await app.request(signed(jpegKey), { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('content-length')).toBe(String(jpeg.byteLength));
    expect(await response.text()).toBe('');
  });

  it('caps max-age at one hour and counts down to expiry', async () => {
    const cacheControl = async (exp: number) => {
      const response = await app.request(signed(jpegKey, exp));
      await response.body?.cancel();
      expect(response.status).toBe(200);
      return response.headers.get('cache-control');
    };
    expect(await cacheControl(NOW + 86_400)).toBe('private, max-age=3600');
    expect(await cacheControl(NOW + 5)).toBe('private, max-age=5');
    expect(await cacheControl(NOW)).toBe('private, max-age=0');
  });

  it('rejects expired links and links signed too far ahead', async () => {
    await expectBareNotFound(await app.request(signed(jpegKey, NOW - 1)));
    await expectBareNotFound(await app.request(signed(jpegKey, NOW + 86_401)));
  });

  it('rejects bad or foreign signatures', async () => {
    const url = new URL(signed(jpegKey));
    const sig = url.searchParams.get('sig') ?? '';
    const flipped = `${sig[0] === 'A' ? 'B' : 'A'}${sig.slice(1)}`;
    await expectBareNotFound(await app.request(url.href.replace(sig, flipped)));
    await expectBareNotFound(await app.request(url.href.replace(jpegKey, pngKey)));
    const otherKey = `${ORIGIN}${signMediaPath(randomBytes(32), jpegKey, NOW + 600)}`;
    await expectBareNotFound(await app.request(otherKey));
  });

  it('rejects malformed or extended queries', async () => {
    const url = signed(jpegKey);
    const query = url.slice(url.indexOf('?'));
    const reordered = `?${query.slice(1).split('&').reverse().join('&')}`;
    for (const candidate of [
      `${ORIGIN}/m/${jpegKey}`,
      `${url}&x=1`,
      `${url}&exp=${NOW + 10}`,
      `${ORIGIN}/m/${jpegKey}${query.replace('exp=', 'exp=0')}`,
      `${ORIGIN}/m/${jpegKey}${query.replace('&', '&&')}`,
    ]) {
      await expectBareNotFound(await app.request(candidate));
    }
    const response = await app.request(`${ORIGIN}/m/${jpegKey}${reordered}`);
    await response.body?.cancel();
    expect(response.status).toBe(200);
  });

  it('never resolves traversal attempts', async () => {
    const query = signed(jpegKey).slice(signed(jpegKey).indexOf('?'));
    for (const path of [
      `/m/..%2f..%2f${jpegKey}`,
      `/m/%2e%2e/${jpegKey}`,
      `/m/${jpegKey}%2f..`,
      `/m/${jpegKey}/..`,
      `/m/${jpegKey.slice(0, 2)}/${jpegKey}`,
      `/m/${jpegKey}%00`,
      `/m/${jpegKey.toUpperCase()}`,
      `/m/${jpegKey.slice(0, 63)}а`,
      `//m/${jpegKey}`,
      `/m//${jpegKey}`,
      `/x/../m/../../${jpegKey}`,
      `/m/%2e%2e%2f%2e%2e%2fetc%2fpasswd`,
    ]) {
      await expectBareNotFound(await app.request(`${ORIGIN}${path}${query}`));
    }
  });

  it('returns a bare 404 for unknown paths and methods', async () => {
    for (const path of ['/', '/m/', '/health', '/v1/workspaces', '/favicon.ico']) {
      await expectBareNotFound(await app.request(`${ORIGIN}${path}`));
    }
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
      await expectBareNotFound(await app.request(signed(jpegKey), { method }));
    }
  });

  it('returns 404 for a signed key with no stored object', async () => {
    await expectBareNotFound(await app.request(signed(keyFor(randomBytes(8)))));
  });

  it('refuses to serve stored bytes that are not an allowlisted image', async () => {
    const html = new TextEncoder().encode('<!doctype html><script>alert(1)</script>');
    const htmlKey = keyFor(html);
    await store.put(htmlKey, html);
    await expectBareNotFound(await app.request(signed(htmlKey)));
    await expectBareNotFound(await app.request(signed(htmlKey), { method: 'HEAD' }));
  });

  it('does not follow a symlink planted in the store', async () => {
    const target = join(root, 'outside.jpg');
    await writeFile(target, jpeg);
    const linkKey = keyFor(randomBytes(8));
    await mkdir(join(root, linkKey.slice(0, 2)), { recursive: true });
    await symlink(target, join(root, linkKey.slice(0, 2), linkKey));
    const response = await app.request(signed(linkKey));
    expect(response.status).not.toBe(200);
    expect(await response.text()).toBe('');
  });

  describe('byte ranges', () => {
    const ranged = (storage: string, range: string, method = 'GET') =>
      app.request(signed(storage), { method, headers: { Range: range } });

    async function expectPartial(response: Response, start: number, end: number): Promise<void> {
      expect(response.status).toBe(206);
      expect(response.headers.get('content-type')).toBe('video/mp4');
      expect(response.headers.get('accept-ranges')).toBe('bytes');
      expect(response.headers.get('content-range')).toBe(`bytes ${start}-${end}/${mp4.byteLength}`);
      expect(response.headers.get('content-length')).toBe(String(end - start + 1));
      expect(response.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(mp4.subarray(start, end + 1));
    }

    it('serves an MP4 in full with Accept-Ranges', async () => {
      const response = await app.request(signed(mp4Key));
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('video/mp4');
      expect(response.headers.get('accept-ranges')).toBe('bytes');
      expect(response.headers.get('content-range')).toBeNull();
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(mp4);
    });

    it('answers a middle, open-ended or suffix range with 206', async () => {
      await expectPartial(await ranged(mp4Key, 'bytes=100-199'), 100, 199);
      await expectPartial(await ranged(mp4Key, 'bytes=4000-'), 4000, mp4.byteLength - 1);
      await expectPartial(await ranged(mp4Key, 'bytes=4000-999999'), 4000, mp4.byteLength - 1);
      await expectPartial(
        await ranged(mp4Key, 'bytes=-50'),
        mp4.byteLength - 50,
        mp4.byteLength - 1,
      );
      await expectPartial(await ranged(mp4Key, 'bytes=-999999'), 0, mp4.byteLength - 1);
    });

    it('answers an unsatisfiable range with 416', async () => {
      for (const range of [`bytes=${mp4.byteLength}-`, 'bytes=99999-100000', 'bytes=-0']) {
        const response = await ranged(mp4Key, range);
        expect(response.status).toBe(416);
        expect(response.headers.get('content-range')).toBe(`bytes */${mp4.byteLength}`);
        expect(await response.text()).toBe('');
      }
    });

    it('ignores multi-range and malformed headers', async () => {
      for (const range of ['bytes=0-1,4-5', 'bytes=5-2', 'bytes=-', 'items=0-1', 'bytes=a-b']) {
        const response = await ranged(mp4Key, range);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-length')).toBe(String(mp4.byteLength));
        expect(new Uint8Array(await response.arrayBuffer())).toEqual(mp4);
      }
    });

    it('answers HEAD with a range with the 206 headers and no body', async () => {
      const response = await ranged(mp4Key, 'bytes=10-19', 'HEAD');
      expect(response.status).toBe(206);
      expect(response.headers.get('content-range')).toBe(`bytes 10-19/${mp4.byteLength}`);
      expect(response.headers.get('content-length')).toBe('10');
      expect(await response.text()).toBe('');
    });

    it('applies ranges to images too', async () => {
      const response = await ranged(jpegKey, 'bytes=0-3');
      expect(response.status).toBe(206);
      expect(response.headers.get('content-type')).toBe('image/jpeg');
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(jpeg.subarray(0, 4));
    });
  });

  it('requires a 32-byte signing key', () => {
    expect(() =>
      createMediaServer({ store, signingKey: randomBytes(16), clock: Temporal.Now.instant }),
    ).toThrow(TypeError);
  });
});
