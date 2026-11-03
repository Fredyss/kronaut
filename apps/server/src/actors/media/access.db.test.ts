import { randomBytes } from 'node:crypto';
import type { Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { MediaStore } from '@kronaut/media';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMediaAccess } from './access.ts';
import { createMediaServer } from './server.ts';
import {
  asUser,
  clock,
  type MediaDb,
  masterOf,
  NOW,
  startMediaDb,
  type Tenant,
  uuidOf,
} from './testing/db.ts';
import { jpegFixture, pngFixture } from './testing.ts';

let test: TestDatabase;
let fx: MediaDb;
let db: Database;
let store: MediaStore;
let a: Tenant;
let b: Tenant;
const signingKey = randomBytes(32);
const ingest: MediaDb['ingest'] = (...args) => fx.ingest(...args);

beforeAll(async () => {
  test = await startTestDatabase();
  fx = await startMediaDb(test, 'media-access');
  ({ db, store, a, b } = fx);
});

afterAll(async () => {
  await fx?.stop();
  await test?.stop();
});

describe('createMediaAccess', () => {
  function access() {
    return createMediaAccess({
      db,
      store,
      signingKey,
      mediaBaseUrl: new URL('https://media.example.test/ignored/path'),
      clock,
    });
  }

  it('signs a URL that the media server serves', async () => {
    const original = jpegFixture({ width: 40, height: 30, exif: true });
    const master = await masterOf(original, 'jpeg');
    const asset = await ingest(a, original);
    const url = await access().signedUrl(a.workspaceId, uuidOf(asset), 300);
    expect(url).toMatch(/^https:\/\/media\.example\.test\/m\/[0-9a-f]{64}\?exp=\d+&sig=[\w-]{43}$/);
    expect(new URL(url).searchParams.get('exp')).toBe(String(NOW.epochMilliseconds / 1000 + 300));
    const server = createMediaServer({ store, signingKey, clock });
    const response = await server.request(url);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('cache-control')).toBe('private, max-age=300');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(master);
    const later = createMediaServer({
      store,
      signingKey,
      clock: () => NOW.add({ seconds: 301 }),
    });
    expect((await later.request(url)).status).toBe(404);
  });

  it('reads the stored master', async () => {
    const original = pngFixture({ width: 6, height: 5 });
    const asset = await ingest(a, original);
    expect(await access().read(a.workspaceId, uuidOf(asset))).toEqual(
      await masterOf(original, 'png'),
    );
  });

  it('refuses assets of another workspace, unready assets and bad ttls', async () => {
    const asset = await ingest(a, jpegFixture({ width: 2, height: 2 }));
    await expect(access().signedUrl(b.workspaceId, uuidOf(asset), 60)).rejects.toThrow();
    await expect(access().read(b.workspaceId, uuidOf(asset))).rejects.toThrow();
    const pending = await db.withTenant(a.workspaceId, asUser(a), (trx) =>
      trx
        .insertInto('media_assets')
        .values({
          workspace_id: a.workspaceId,
          kind: 'image',
          state: 'uploading',
          storage_key: randomBytes(32).toString('hex'),
        })
        .returning('id')
        .executeTakeFirstOrThrow(),
    );
    await expect(access().signedUrl(a.workspaceId, pending.id, 60)).rejects.toThrow();
    for (const ttl of [0, -1, 1.5, 86_401, Number.NaN]) {
      await expect(access().signedUrl(a.workspaceId, uuidOf(asset), ttl)).rejects.toThrow(
        RangeError,
      );
    }
  });
});
