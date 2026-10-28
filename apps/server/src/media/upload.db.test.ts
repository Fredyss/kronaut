import { randomUUID } from 'node:crypto';
import { readdir, readFile, stat, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { encodePublicId } from '@kronaut/core';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CRON_TASKS, cronItems } from '../cron.ts';
import type { BoundRoute, RequestContext } from '../http/types.ts';
import { installJobQueue } from '../job-queue.ts';
import { asUser, type MediaDb, NOW, startMediaDb, type Tenant, uuidOf } from './db-testing.ts';
import { collectMedia } from './gc.ts';
import { createStaging, type Staging } from './staging.ts';
import { expectMediaError } from './testing.ts';
import { VIDEO_PART_SIZE } from './upload.ts';
import { uploadRoutes, videoUploadRoute } from './upload-routes.ts';

const CLI: Actor = { kind: 'cli' };
const TAIL = 100;
const TOTAL = VIDEO_PART_SIZE + TAIL;

let test: TestDatabase;
let fx: MediaDb;
let owner: Database;
let staging: Staging;
let a: Tenant;
let b: Tenant;
let createRoute: BoundRoute;
let partRoute: BoundRoute;
let completeRoute: BoundRoute;

beforeAll(async () => {
  test = await startTestDatabase();
  fx = await startMediaDb(test, 'upload');
  ({ a, b } = fx);
  owner = createDatabase({ connectionString: test.ownerUrl });
  await installJobQueue(test.ownerUrl, owner);
  staging = createStaging(join(fx.root, '.staging'));
  const routes = uploadRoutes({ staging });
  [createRoute, partRoute, completeRoute] = routes as [BoundRoute, BoundRoute, BoundRoute];
});

afterAll(async () => {
  await owner?.destroy();
  await fx?.stop();
  await test?.stop();
});

function context(tenant: Tenant): RequestContext {
  return {
    requestId: randomUUID(),
    principal: null,
    session: null,
    now: NOW,
    logger: pino({ level: 'silent' }),
    ipPrefix: null,
    tenant: (fn) => fx.db.withTenant(tenant.workspaceId, asUser(tenant), fn),
    authorize: () => ({ kind: 'allow' }),
    cookie: () => undefined,
    setCookie: () => undefined,
    clearCookie: () => undefined,
  };
}

const ws = (tenant: Tenant) => encodePublicId('workspace', tenant.workspaceId);

async function create(tenant: Tenant, overrides: Record<string, unknown> = {}) {
  const body = videoUploadRoute.body.parse({
    kind: 'video',
    bytes: TOTAL,
    mime: 'video/mp4',
    ...overrides,
  });
  const result = await createRoute.handler(
    { params: { workspaceId: ws(tenant) }, query: undefined, body },
    context(tenant),
  );
  expect(result.status).toBe(201);
  return videoUploadRoute.response.parse(result.body);
}

function put(tenant: Tenant, mediaId: string, part: number, bytes: Uint8Array) {
  return partRoute.handler(
    {
      params: { workspaceId: ws(tenant), mediaId, part: String(part) },
      query: undefined,
      body: bytes,
    },
    context(tenant),
  );
}

function complete(tenant: Tenant, mediaId: string) {
  return completeRoute.handler(
    { params: { workspaceId: ws(tenant), mediaId }, query: undefined, body: undefined },
    context(tenant),
  );
}

async function putAll(tenant: Tenant, mediaId: string): Promise<void> {
  await put(tenant, mediaId, 1, new Uint8Array(VIDEO_PART_SIZE));
  await put(tenant, mediaId, 2, new Uint8Array(TAIL));
}

function asOwner<T>(fn: Parameters<Database['withActor']>[1]) {
  return owner.withActor(CLI, fn) as Promise<T>;
}

async function row(mediaId: string) {
  return await asOwner<{ state: string; storage_key: string; upload_expires_at: Date | null }>(
    async (trx) =>
      trx
        .selectFrom('media_assets')
        .select(['state', 'storage_key', 'upload_expires_at', 'original_name', 'bytes', 'mime'])
        .where('id', '=', decodeMedia(mediaId))
        .executeTakeFirst(),
  );
}

function decodeMedia(mediaId: string): string {
  return uuidOf({ id: mediaId });
}

async function setColumn(mediaId: string, column: 'upload_expires_at' | 'created_at', ago: string) {
  await asOwner(async (trx) =>
    sql`update media_assets set ${sql.ref(column)} = now() - ${ago}::interval
         where id = ${decodeMedia(mediaId)}`.execute(trx),
  );
}

async function jobs(mediaId: string) {
  return await asOwner<{ task: string; queue: string | null; attempts: number; key: string }[]>(
    async (trx) => {
      const { rows } = await sql`
        select t.identifier as task, q.queue_name as queue, j.max_attempts as attempts, j.key
          from graphile_worker._private_jobs j
          join graphile_worker._private_tasks t on t.id = j.task_id
          left join graphile_worker._private_job_queues q on q.id = j.job_queue_id
         where j.payload->>'id' = ${decodeMedia(mediaId)}
      `.execute(trx);
      return rows;
    },
  );
}

async function incoming(): Promise<string[]> {
  return await readdir(join(fx.root, '.staging', '.incoming')).catch(() => []);
}

describe('create', () => {
  it('returns the part plan and an uploading row with a staging key', async () => {
    const before = Date.now();
    const plan = await create(a, { filename: 'Café.mov', mime: 'video/quicktime' });
    expect(plan).toMatchObject({
      partSize: VIDEO_PART_SIZE,
      partCount: 2,
      media: { kind: 'video', state: 'uploading', bytes: TOTAL, mime: null, sha256: null },
    });
    const ttl = Date.parse(plan.expiresAt) - before;
    expect(ttl).toBeGreaterThan(24 * 3_600_000 - 60_000);
    expect(ttl).toBeLessThan(24 * 3_600_000 + 60_000);
    expect(await row(plan.media.id)).toMatchObject({
      state: 'uploading',
      storage_key: expect.stringMatching(/^[0-9a-f]{64}$/),
      original_name: 'Café.mov',
      bytes: String(TOTAL),
      mime: null,
    });
  });

  it('refuses a source over 300 MB with 413 file_too_large', async () => {
    const error = create(a, { bytes: 300_000_001 });
    await expectMediaError(error, 'payload_too_large', 413);
    await expect(error).rejects.toMatchObject({
      details: [{ path: 'body.bytes', code: 'file_too_large' }],
    });
  });

  it('refuses an unsupported mime with 415 mime_unsupported', async () => {
    const error = create(a, { mime: 'video/x-msvideo' });
    await expectMediaError(error, 'unsupported_media_type', 415);
    await expect(error).rejects.toMatchObject({
      details: [{ path: 'body.mime', code: 'mime_unsupported' }],
    });
  });
});

describe('parts', () => {
  it('refuses a wrong size or an out-of-range part and discards the temp file', async () => {
    const { media } = await create(a);
    await expectMediaError(put(a, media.id, 1, new Uint8Array(TAIL)), 'invalid_request', 400);
    await expectMediaError(put(a, media.id, 2, new Uint8Array(TAIL + 1)), 'invalid_request', 400);
    await expectMediaError(put(a, media.id, 3, new Uint8Array(TAIL)), 'invalid_request', 400);
    await expect(put(a, media.id, 1, new Uint8Array(1))).rejects.toMatchObject({
      details: [{ path: 'body', code: 'part_size' }],
    });
    expect(await incoming()).toEqual([]);
    expect(await staging.parts((await row(media.id))?.storage_key ?? '')).toEqual(new Map());
  });

  it('closes an expired upload with 409 upload_closed', async () => {
    const { media } = await create(a);
    await setColumn(media.id, 'upload_expires_at', '1 minute');
    const error = put(a, media.id, 2, new Uint8Array(TAIL));
    await expectMediaError(error, 'conflict', 409);
    await expect(error).rejects.toMatchObject({
      details: [{ path: 'params.mediaId', code: 'upload_closed' }],
    });
    await expectMediaError(complete(a, media.id), 'conflict', 409);
    expect(await incoming()).toEqual([]);
  });

  it('replaces a repeated part and refuses parts after complete', async () => {
    const { media } = await create(a);
    const first = await put(a, media.id, 2, new Uint8Array(TAIL).fill(1));
    expect(first.body).toEqual({ part: 2, bytes: TAIL });
    await put(a, media.id, 2, new Uint8Array(TAIL).fill(2));
    const key = (await row(media.id))?.storage_key ?? '';
    const stored = await readFile(join(staging.directory(key), '2.part'));
    expect(stored.every((byte) => byte === 2)).toBe(true);
    await put(a, media.id, 1, new Uint8Array(VIDEO_PART_SIZE));
    await complete(a, media.id);
    await expectMediaError(put(a, media.id, 2, new Uint8Array(TAIL)), 'conflict', 409);
    expect(await incoming()).toEqual([]);
  });

  it('hides another workspace upload behind 404', async () => {
    const { media } = await create(a);
    await expectMediaError(put(b, media.id, 2, new Uint8Array(TAIL)), 'not_found', 404);
    await expectMediaError(complete(b, media.id), 'not_found', 404);
    expect(await incoming()).toEqual([]);
  });
});

describe('complete', () => {
  it('refuses a missing part with 409 upload_incomplete', async () => {
    const { media } = await create(a);
    await put(a, media.id, 1, new Uint8Array(VIDEO_PART_SIZE));
    const error = complete(a, media.id);
    await expectMediaError(error, 'conflict', 409);
    await expect(error).rejects.toMatchObject({
      details: [{ path: 'params.mediaId', code: 'upload_incomplete' }],
    });
    expect((await row(media.id))?.state).toBe('uploading');
    expect(await jobs(media.id)).toEqual([]);
  });

  it('moves to processing, enqueues one media job and is a no-op when repeated', async () => {
    const { media } = await create(a);
    await putAll(a, media.id);
    const done = await complete(a, media.id);
    expect(done.body).toMatchObject({ id: media.id, state: 'processing' });
    expect(await row(media.id)).toMatchObject({ state: 'processing', upload_expires_at: null });
    const expected = [
      { task: 'media_process', queue: 'media', attempts: 3, key: `media:${decodeMedia(media.id)}` },
    ];
    expect(await jobs(media.id)).toEqual(expected);
    const again = await complete(a, media.id);
    expect(again.body).toEqual(done.body);
    expect(await jobs(media.id)).toEqual(expected);
  });
});

describe('media gc', () => {
  it('runs hourly without backfill', () => {
    const item = cronItems(false).find((cron) => cron.identifier === CRON_TASKS.mediaGc);
    expect(item).toMatchObject({
      task: 'media_gc',
      options: { backfillPeriod: 0, maxAttempts: 1 },
    });
  });

  it('deletes an upload older than 24 h with its staging dir, keeps a 23 h one, sweeps stale temp files', async () => {
    const old = (await create(a)).media;
    const young = (await create(b)).media;
    await put(a, old.id, 2, new Uint8Array(TAIL));
    await put(b, young.id, 2, new Uint8Array(TAIL));
    const oldKey = (await row(old.id))?.storage_key ?? '';
    const youngKey = (await row(young.id))?.storage_key ?? '';
    await setColumn(old.id, 'created_at', '25 hours');
    await setColumn(young.id, 'created_at', '23 hours');
    const stale = await staging.receive(new Uint8Array(1));
    const fresh = await staging.receive(new Uint8Array(1));
    const past = new Date(Date.now() - 2 * 3_600_000);
    await utimes(stale, past, past);
    expect(JSON.parse(await collectMedia(fx.db, { staging, store: fx.store }))).toEqual({
      expired: 1,
      purged: 0,
      skipped: 0,
      incoming: 1,
    });
    expect(await incoming()).toEqual([fresh.slice(-32)]);
    await staging.discard(fresh);
    expect(await row(old.id)).toBeUndefined();
    await expect(stat(staging.directory(oldKey))).rejects.toMatchObject({ code: 'ENOENT' });
    expect((await row(young.id))?.state).toBe('uploading');
    expect(await staging.parts(youngKey)).toEqual(new Map([[2, TAIL]]));
  });
});
