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
const key = randomBytes(32);
const jpeg = jpegFixture({ width: 4, height: 4 });
const png = pngFixture();

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

  it('requires a 32-byte signing key', () => {
    expect(() =>
      createMediaServer({ store, signingKey: randomBytes(16), clock: Temporal.Now.instant }),
    ).toThrow(TypeError);
  });
});
