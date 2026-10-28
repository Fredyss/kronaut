import { createHash, randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { type Action, encodePublicId, type Resource } from '@kronaut/core';
import type { Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { type MediaStore, storageKey } from '@kronaut/media';
import { sql } from 'kysely';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RequestContext } from '../http/types.ts';
import {
  asUser,
  clock,
  type MediaDb,
  masterOf,
  NOW,
  startMediaDb,
  type Tenant,
  uuidOf,
} from './db-testing.ts';
import { findMediaAsset } from './dto.ts';
import { MEDIA_IMAGE_MAX_BYTES } from './ingest.ts';
import {
  MEDIA_UPLOAD_BODY_LIMIT,
  mediaGetRoute,
  mediaMarkAiRoute,
  mediaRoutes,
  mediaUploadRoute,
} from './routes.ts';
import {
  bytes,
  expectMediaError,
  includes,
  JPEG_COMMENT_SECRET,
  JPEG_EXIF_SECRET,
  jpegFixture,
  PNG_SIGNATURE,
  pngBomb,
  pngChunk,
  pngFixture,
  pngIhdr,
  riffChunk,
  VP8X_ANIMATION,
  vp8xChunk,
  WEBP_EXIF_SECRET,
  WEBP_XMP_SECRET,
  webpExtendedFixture,
  webpFile,
  withOrientation,
} from './testing.ts';

let test: TestDatabase;
let fx: MediaDb;
let db: Database;
let root: string;
let store: MediaStore;
let a: Tenant;
let b: Tenant;
const ingest: MediaDb['ingest'] = (...args) => fx.ingest(...args);

function rowOf(tenant: Tenant, asset: { id: string }) {
  return db.withTenant(tenant.workspaceId, asUser(tenant), (trx) =>
    trx.selectFrom('media_assets').selectAll().where('id', '=', uuidOf(asset)).executeTakeFirst(),
  );
}

function countAssets(tenant: Tenant): Promise<number> {
  return db.withTenant(tenant.workspaceId, asUser(tenant), async (trx) => {
    const row = await trx
      .selectFrom('media_assets')
      .select((eb) => eb.fn.countAll<string>().as('n'))
      .executeTakeFirstOrThrow();
    return Number(row.n);
  });
}

async function readStored(key: string): Promise<Uint8Array> {
  const opened = await store.open(key);
  if (opened === null) throw new Error('missing object');
  const chunks: Buffer[] = [];
  for await (const chunk of opened.stream) chunks.push(Buffer.from(chunk));
  return new Uint8Array(Buffer.concat(chunks));
}

function sha256(data: Uint8Array): Buffer {
  return createHash('sha256').update(data).digest();
}

async function storedFiles(): Promise<string[]> {
  return (await readdir(root, { recursive: true })).sort();
}

beforeAll(async () => {
  test = await startTestDatabase();
  fx = await startMediaDb(test, 'media');
  ({ db, store, root, a, b } = fx);
});

afterAll(async () => {
  await fx?.stop();
  await test?.stop();
});

describe('ingestImage', () => {
  it('stores a re-encoded master and a ready row that satisfies the schema', async () => {
    const original = jpegFixture({
      width: 32,
      height: 16,
      exif: true,
      xmp: true,
      comment: JPEG_COMMENT_SECRET,
    });
    const master = await masterOf(original, 'jpeg');
    const asset = await ingest(a, original, 'café.jpg');
    expect(asset).toEqual({
      id: expect.stringMatching(/^media_[0-9a-hjkmnp-tv-z]{26}$/),
      kind: 'image',
      mime: 'image/jpeg',
      bytes: master.byteLength,
      width: 32,
      height: 16,
      durationMs: null,
      frameRate: null,
      sha256: sha256(master).toString('hex'),
      state: 'ready',
      aiGenerated: false,
      rejectedReason: null,
      duplicateOf: null,
    });
    const row = await rowOf(a, asset);
    const key = storageKey(a.workspaceId, sha256(master));
    expect(row).toMatchObject({
      workspace_id: a.workspaceId,
      kind: 'image',
      state: 'ready',
      storage_key: key,
      source_sha256: sha256(original),
      sha256: sha256(master),
      mime: 'image/jpeg',
      bytes: String(master.byteLength),
      width: 32,
      height: 16,
      duration_ms: null,
      frame_rate_milli: null,
      original_name: 'café.jpg',
      uploaded_by_user_id: a.userId,
      uploaded_by_grant_id: null,
      deleted_at: null,
      original_purged_at: null,
    });
    const stored = await readStored(key);
    expect(stored).toEqual(master);
    expect(includes(stored, JPEG_EXIF_SECRET)).toBe(false);
    expect(includes(stored, JPEG_COMMENT_SECRET)).toBe(false);
    expect(includes(stored, 'xmpmeta')).toBe(false);
  });

  it('applies the EXIF orientation before recording the dimensions', async () => {
    const landscape = await masterOf(pngFixture({ width: 40, height: 20 }), 'jpeg');
    const rotated = withOrientation(landscape, 6);
    expect(includes(rotated, 'Exif')).toBe(true);
    const asset = await ingest(a, rotated);
    expect(asset).toMatchObject({ mime: 'image/jpeg', width: 20, height: 40 });
    const row = await rowOf(a, asset);
    expect(row).toMatchObject({ width: 20, height: 40 });
    expect(includes(await readStored(row?.storage_key ?? ''), 'Exif')).toBe(false);
  });

  it('refuses decompression bombs and undecodable images without storing anything', async () => {
    const before = await countAssets(a);
    const files = await storedFiles();
    const bomb = pngBomb(8000, 8000);
    expect(bomb.byteLength).toBeLessThan(64 * 1024);
    await expectMediaError(ingest(a, bomb), 'invalid_request', 400, 'image exceeds 50 megapixels');
    const garbageIdat = bytes(
      PNG_SIGNATURE,
      pngIhdr(4, 4),
      pngChunk('IDAT', 'this is not a zlib stream'),
      pngChunk('IEND'),
    );
    const emptyFrame = webpFile(
      vp8xChunk(VP8X_ANIMATION, 640, 360),
      riffChunk('ANIM', [0, 0, 0, 0, 0, 0]),
      riffChunk('ANMF', new Uint8Array(16)),
    );
    for (const input of [garbageIdat, emptyFrame]) {
      await expectMediaError(
        ingest(a, input),
        'invalid_request',
        400,
        'image is corrupt or truncated',
      );
    }
    expect(await storedFiles()).toEqual(files);
    expect(await countAssets(a)).toBe(before);
  });

  it('accepts PNG and WebP and records their sniffed type', async () => {
    const png = await ingest(a, pngFixture({ width: 3, height: 2 }));
    expect(png).toMatchObject({ mime: 'image/png', width: 3, height: 2 });
    const webp = await ingest(a, webpExtendedFixture(5, 4));
    expect(webp).toMatchObject({ mime: 'image/webp', width: 5, height: 4 });
    const stored = await readStored((await rowOf(a, webp))?.storage_key ?? '');
    expect(includes(stored, WEBP_EXIF_SECRET)).toBe(false);
    expect(includes(stored, WEBP_XMP_SECRET)).toBe(false);
    expect((await rowOf(a, webp))?.original_name).toBeNull();
  });

  it('returns the existing asset for the same master in the same workspace', async () => {
    const plain = jpegFixture({ width: 8, height: 8 });
    const first = await ingest(a, plain, 'first.jpg');
    const before = await countAssets(a);
    const again = await ingest(a, plain, 'second.jpg');
    const withExif = await ingest(a, jpegFixture({ width: 8, height: 8, exif: true }));
    expect(again).toEqual(first);
    expect(withExif).toEqual(first);
    expect(await countAssets(a)).toBe(before);
    expect((await rowOf(a, first))?.original_name).toBe('first.jpg');
  });

  it('marks an image AI-generated and never clears the mark on a repeat upload', async () => {
    const image = jpegFixture({ width: 9, height: 7 });
    const plain = await ingest(a, image);
    expect(plain.aiGenerated).toBe(false);
    const marked = await ingest(a, image, undefined, true);
    expect(marked).toEqual({ ...plain, aiGenerated: true });
    expect(await ingest(a, image)).toEqual(marked);
  });

  it('keeps workspaces apart even for identical bytes', async () => {
    const image = jpegFixture({ width: 24, height: 24 });
    const mine = await ingest(a, image);
    const theirs = await ingest(b, image);
    expect(theirs.id).not.toBe(mine.id);
    expect(theirs.sha256).toBe(mine.sha256);
    expect((await rowOf(b, theirs))?.storage_key).not.toBe((await rowOf(a, mine))?.storage_key);
    expect(await rowOf(b, mine)).toBeUndefined();
    const crossRead = await db.withTenant(b.workspaceId, asUser(b), (trx) =>
      findMediaAsset(trx, a.workspaceId, uuidOf(mine)),
    );
    expect(crossRead).toBeNull();
  });

  it('restores a soft-deleted asset when the same image is uploaded again', async () => {
    const image = pngFixture({ width: 7, height: 7 });
    const first = await ingest(a, image);
    await db.withTenant(a.workspaceId, asUser(a), (trx) =>
      trx
        .updateTable('media_assets')
        .set({ deleted_at: sql<Date>`now()` })
        .where('id', '=', uuidOf(first))
        .execute(),
    );
    const hidden = await db.withTenant(a.workspaceId, asUser(a), (trx) =>
      findMediaAsset(trx, a.workspaceId, uuidOf(first)),
    );
    expect(hidden).toBeNull();
    const restored = await ingest(a, image);
    expect(restored).toEqual(first);
    expect((await rowOf(a, first))?.deleted_at).toBeNull();
  });

  it('rejects oversized, unsupported, corrupt and badly named uploads without a row', async () => {
    const before = await countAssets(a);
    const huge = new Uint8Array(MEDIA_IMAGE_MAX_BYTES + 1);
    huge.set(jpegFixture());
    await expectMediaError(ingest(a, huge), 'payload_too_large', 413);
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');
    await expectMediaError(ingest(a, svg), 'unsupported_media_type', 415);
    await expectMediaError(ingest(a, jpegFixture().subarray(0, 40)), 'invalid_request', 400);
    await expectMediaError(ingest(a, jpegFixture(), ''), 'invalid_request', 400);
    await expectMediaError(ingest(a, jpegFixture(), 'x'.repeat(256)), 'invalid_request', 400);
    const unseen = jpegFixture({ width: 11, height: 13 });
    for (const name of ['a\u0000b.jpg', 'line\nbreak.jpg', 'del\u007f.jpg', 'nel\u0085.jpg']) {
      await expectMediaError(ingest(a, unseen, name), 'invalid_request', 400);
    }
    const unseenKey = storageKey(a.workspaceId, sha256(await masterOf(unseen, 'jpeg')));
    expect(await store.open(unseenKey)).toBeNull();
    expect(await countAssets(a)).toBe(before);
  });
});

describe('media routes', () => {
  function context(
    tenant: Tenant,
    calls: [Action, Resource][],
    decision: ReturnType<RequestContext['authorize']> = { kind: 'allow' },
  ): RequestContext {
    return {
      requestId: randomUUID(),
      principal: {
        kind: 'user',
        userId: tenant.userId,
        workspaceId: tenant.workspaceId,
        role: 'owner',
        canApprove: true,
        restricted: false,
        authenticatedAt: NOW,
      },
      session: null,
      now: NOW,
      logger: pino({ level: 'silent' }),
      ipPrefix: null,
      tenant: (fn) => db.withTenant(tenant.workspaceId, asUser(tenant), fn),
      authorize: (action, resource) => {
        calls.push([action, resource]);
        return decision;
      },
      cookie: () => undefined,
      setCookie: () => undefined,
      clearCookie: () => undefined,
    };
  }

  it('exposes the upload and read routes with the agreed shape', () => {
    const [upload, get] = mediaRoutes({ store, clock });
    expect(MEDIA_UPLOAD_BODY_LIMIT).toBe(12 * 1024 * 1024);
    expect(upload?.route).toBe(mediaUploadRoute);
    expect(get?.route).toBe(mediaGetRoute);
    expect(mediaUploadRoute).toMatchObject({
      id: 'media.upload',
      method: 'POST',
      action: 'media:write',
      auth: ['session', 'grant'],
      status: 201,
      idempotency: true,
    });
    expect(mediaGetRoute).toMatchObject({ id: 'media.get', method: 'GET', action: 'media:read' });
  });

  it('uploads through the handler and reads the asset back', async () => {
    const [upload, get] = mediaRoutes({ store, clock });
    if (upload === undefined || get === undefined) throw new Error('routes missing');
    const calls: [Action, Resource][] = [];
    const ctx = context(a, calls);
    const image = webpExtendedFixture(9, 9);
    const body = mediaUploadRoute.body.parse({
      filename: 'pic.webp',
      dataBase64: Buffer.from(image).toString('base64'),
    });
    const created = await upload.handler(
      {
        params: { workspaceId: encodePublicId('workspace', a.workspaceId) },
        query: undefined,
        body,
      },
      ctx,
    );
    expect(created.status).toBe(201);
    const dto = mediaUploadRoute.response.parse(created.body);
    expect(dto).toMatchObject({ kind: 'image', mime: 'image/webp', width: 9, height: 9 });
    const fetched = await get.handler(
      {
        params: { workspaceId: encodePublicId('workspace', a.workspaceId), mediaId: dto.id },
        query: undefined,
        body: undefined,
      },
      ctx,
    );
    expect(fetched.body).toEqual(dto);
    expect(calls).toEqual([
      ['media:write', { workspaceId: a.workspaceId }],
      ['media:read', { workspaceId: a.workspaceId }],
    ]);
    const foreign = get.handler(
      {
        params: { workspaceId: encodePublicId('workspace', b.workspaceId), mediaId: dto.id },
        query: undefined,
        body: undefined,
      },
      context(b, []),
    );
    await expectMediaError(foreign, 'not_found', 404);
  });

  it('marks an asset AI-generated, keeps the mark, and hides other workspaces', async () => {
    const mark = mediaRoutes({ store, clock }).find((bound) => bound.route === mediaMarkAiRoute);
    if (mark === undefined) throw new Error('route missing');
    const asset = await fx.ingest(a, webpExtendedFixture(11, 11));
    const params = { workspaceId: encodePublicId('workspace', a.workspaceId), mediaId: asset.id };
    const input = { params, query: undefined, body: undefined };
    const calls: [Action, Resource][] = [];
    const marked = await mark.handler(input, context(a, calls));
    expect(mediaMarkAiRoute.response.parse(marked.body).aiGenerated).toBe(true);
    expect((await mark.handler(input, context(a, []))).body).toEqual(marked.body);
    expect(calls).toEqual([['media:write', { workspaceId: a.workspaceId }]]);
    const foreign = {
      ...input,
      params: { workspaceId: encodePublicId('workspace', b.workspaceId), mediaId: asset.id },
    };
    await expectMediaError(mark.handler(foreign, context(b, [])), 'not_found', 404);
    const audits = await db.withTenant(a.workspaceId, asUser(a), (trx) =>
      trx
        .selectFrom('audit_events')
        .select(['action', 'actor_kind', 'actor_id', 'resource_kind'])
        .where('resource_id', '=', uuidOf(asset))
        .execute(),
    );
    expect(audits).toEqual([
      {
        action: 'media.ai_marked',
        actor_kind: 'user',
        actor_id: a.userId,
        resource_kind: 'media_asset',
      },
    ]);
  });

  it('refuses to mark a rejected asset', async () => {
    const mark = mediaRoutes({ store, clock }).find((bound) => bound.route === mediaMarkAiRoute);
    if (mark === undefined) throw new Error('route missing');
    const asset = await fx.ingest(a, webpExtendedFixture(13, 13));
    await db.withTenant(a.workspaceId, asUser(a), (trx) =>
      sql`update media_assets set state = 'rejected' where id = ${uuidOf(asset)}`.execute(trx),
    );
    const params = { workspaceId: encodePublicId('workspace', a.workspaceId), mediaId: asset.id };
    const marking = mark.handler({ params, query: undefined, body: undefined }, context(a, []));
    await expectMediaError(marking, 'conflict', 409);
  });

  it('refuses a scoped read because media has no scope units', async () => {
    const [, get] = mediaRoutes({ store, clock });
    if (get === undefined) throw new Error('routes missing');
    const asset = await ingest(a, pngFixture({ width: 4, height: 9 }));
    const scope = { brandIds: [randomUUID()], locationIds: [], socialAccountIds: [] };
    const result = get.handler(
      {
        params: { workspaceId: encodePublicId('workspace', a.workspaceId), mediaId: asset.id },
        query: undefined,
        body: undefined,
      },
      context(a, [], { kind: 'allow_scoped', scope }),
    );
    await expectMediaError(result, 'forbidden', 403);
  });

  it('only accepts prefixed public ids and answers 404 for anything else', async () => {
    const [upload, get] = mediaRoutes({ store, clock });
    if (upload === undefined || get === undefined) throw new Error('routes missing');
    const asset = await ingest(a, pngFixture({ width: 4, height: 9 }));
    const ws = encodePublicId('workspace', a.workspaceId);
    const read = (workspaceId: string, mediaId: string) => {
      const calls: [Action, Resource][] = [];
      const result = get.handler(
        { params: { workspaceId, mediaId }, query: undefined, body: undefined },
        context(a, calls),
      );
      return { calls, result };
    };
    expect((await read(ws, asset.id).result).body).toEqual(asset);
    for (const [workspaceId, mediaId] of [
      [a.workspaceId, asset.id],
      [ws, uuidOf(asset)],
      [encodePublicId('post', a.workspaceId), asset.id],
      [ws, encodePublicId('post', uuidOf(asset))],
      [ws, 'media_zzzzzzzzzzzzzzzzzzzzzzzzzz'],
    ] as const) {
      const { calls, result } = read(workspaceId, mediaId);
      await expectMediaError(result, 'not_found', 404);
      expect(calls).toEqual([]);
    }
    const body = mediaUploadRoute.body.parse({
      dataBase64: Buffer.from(pngFixture({ width: 4, height: 9 })).toString('base64'),
    });
    await expectMediaError(
      upload.handler(
        { params: { workspaceId: a.workspaceId }, query: undefined, body },
        context(a, []),
      ),
      'not_found',
      404,
    );
  });

  it('rejects bodies that are not base64 or exceed the decoded cap', () => {
    const parse = (dataBase64: string) => mediaUploadRoute.body.safeParse({ dataBase64 }).success;
    expect(parse('not base64!')).toBe(false);
    expect(parse('')).toBe(false);
    expect(parse('A'.repeat(Math.ceil(MEDIA_IMAGE_MAX_BYTES / 3) * 4 + 4))).toBe(false);
    expect(parse(Buffer.from(jpegFixture()).toString('base64'))).toBe(true);
  });

  it('rejects filenames with control characters', () => {
    const dataBase64 = Buffer.from(jpegFixture()).toString('base64');
    const parse = (filename: string) =>
      mediaUploadRoute.body.safeParse({ filename, dataBase64 }).success;
    expect(parse('a\u0000b.jpg')).toBe(false);
    expect(parse('tab\there.jpg')).toBe(false);
    expect(parse('del\u007f.jpg')).toBe(false);
    expect(parse('café 2026.jpg')).toBe(true);
  });
});
