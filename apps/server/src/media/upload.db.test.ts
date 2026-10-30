import { readdir, readFile, stat, utimes } from 'node:fs/promises';
import { join } from 'node:path';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CRON_TASKS, cronItems } from '../cron.ts';
import { expectError } from '../http/testing.ts';
import { installJobQueue } from '../job-queue.ts';
import { type MediaDb, stagingUnder, startMediaDb, type Tenant, uuidOf } from './db-testing.ts';
import { collectMedia } from './gc.ts';
import type { Staging } from './staging.ts';
import { VIDEO_PART_SIZE } from './upload.ts';
import { videoUploadRoute } from './upload-routes.ts';

const CLI: Actor = { kind: 'cli' };
const TAIL = 100;
const TOTAL = VIDEO_PART_SIZE + TAIL;

let test: TestDatabase;
let fx: MediaDb;
let owner: Database;
let staging: Staging;
let a: Tenant;
let b: Tenant;

beforeAll(async () => {
  test = await startTestDatabase();
  fx = await startMediaDb(test, 'upload', { staging: stagingUnder });
  ({ a, b, staging } = fx);
  owner = createDatabase({ connectionString: test.ownerUrl });
  await installJobQueue(test.ownerUrl, owner);
});

afterAll(async () => {
  await owner?.destroy();
  await fx?.stop();
  await test?.stop();
});

function requestCreate(tenant: Tenant, overrides: Record<string, unknown> = {}) {
  const body = { kind: 'video', bytes: TOTAL, mime: 'video/mp4', ...overrides };
  return fx.call(tenant, 'POST', 'media/uploads', { body });
}

async function create(tenant: Tenant, overrides: Record<string, unknown> = {}) {
  const response = await requestCreate(tenant, overrides);
  expect(response.status).toBe(201);
  return videoUploadRoute.response.parse(await response.json());
}

function put(tenant: Tenant, mediaId: string, part: number, bytes: Uint8Array) {
  return fx.call(tenant, 'PUT', `media/${mediaId}/parts/${part}`, { body: bytes });
}

async function stored(tenant: Tenant, mediaId: string, part: number, bytes: Uint8Array) {
  const response = await put(tenant, mediaId, part, bytes);
  expect(response.status).toBe(200);
  return await response.json();
}

function complete(tenant: Tenant, mediaId: string) {
  return fx.call(tenant, 'POST', `media/${mediaId}/complete`);
}

async function completed(tenant: Tenant, mediaId: string) {
  const response = await complete(tenant, mediaId);
  expect(response.status).toBe(200);
  return await response.json();
}

async function putAll(tenant: Tenant, mediaId: string): Promise<void> {
  await stored(tenant, mediaId, 1, new Uint8Array(VIDEO_PART_SIZE));
  await stored(tenant, mediaId, 2, new Uint8Array(TAIL));
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
    const error = await expectError(
      await requestCreate(a, { bytes: 300_000_001 }),
      413,
      'payload_too_large',
    );
    expect(error.details).toEqual([{ path: 'body.bytes', code: 'file_too_large' }]);
  });

  it('refuses an unsupported mime with 415 mime_unsupported', async () => {
    const error = await expectError(
      await requestCreate(a, { mime: 'video/x-msvideo' }),
      415,
      'unsupported_media_type',
    );
    expect(error.details).toEqual([{ path: 'body.mime', code: 'mime_unsupported' }]);
  });
});

describe('parts', () => {
  it('refuses a wrong size or an out-of-range part and discards the temp file', async () => {
    const { media } = await create(a);
    await expectError(await put(a, media.id, 1, new Uint8Array(TAIL)), 400, 'invalid_request');
    await expectError(await put(a, media.id, 2, new Uint8Array(TAIL + 1)), 400, 'invalid_request');
    await expectError(await put(a, media.id, 3, new Uint8Array(TAIL)), 400, 'invalid_request');
    const error = await expectError(
      await put(a, media.id, 1, new Uint8Array(1)),
      400,
      'invalid_request',
    );
    expect(error.details).toEqual([{ path: 'body', code: 'part_size' }]);
    expect(await incoming()).toEqual([]);
    expect(await staging.parts((await row(media.id))?.storage_key ?? '')).toEqual(new Map());
  });

  it('closes an expired upload with 409 upload_closed', async () => {
    const { media } = await create(a);
    await setColumn(media.id, 'upload_expires_at', '1 minute');
    const error = await expectError(
      await put(a, media.id, 2, new Uint8Array(TAIL)),
      409,
      'conflict',
    );
    expect(error.details).toEqual([{ path: 'params.mediaId', code: 'upload_closed' }]);
    await expectError(await complete(a, media.id), 409, 'conflict');
    expect(await incoming()).toEqual([]);
  });

  it('replaces a repeated part and refuses parts after complete', async () => {
    const { media } = await create(a);
    const first = await stored(a, media.id, 2, new Uint8Array(TAIL).fill(1));
    expect(first).toEqual({ part: 2, bytes: TAIL });
    await stored(a, media.id, 2, new Uint8Array(TAIL).fill(2));
    const key = (await row(media.id))?.storage_key ?? '';
    const file = await readFile(join(staging.directory(key), '2.part'));
    expect(file.every((byte) => byte === 2)).toBe(true);
    await stored(a, media.id, 1, new Uint8Array(VIDEO_PART_SIZE));
    await completed(a, media.id);
    await expectError(await put(a, media.id, 2, new Uint8Array(TAIL)), 409, 'conflict');
    expect(await incoming()).toEqual([]);
  });

  it('hides another workspace upload behind 404', async () => {
    const { media } = await create(a);
    await expectError(await put(b, media.id, 2, new Uint8Array(TAIL)), 404, 'not_found');
    await expectError(await complete(b, media.id), 404, 'not_found');
    expect(await incoming()).toEqual([]);
  });
});

describe('complete', () => {
  it('refuses a missing part with 409 upload_incomplete', async () => {
    const { media } = await create(a);
    await stored(a, media.id, 1, new Uint8Array(VIDEO_PART_SIZE));
    const error = await expectError(await complete(a, media.id), 409, 'conflict');
    expect(error.details).toEqual([{ path: 'params.mediaId', code: 'upload_incomplete' }]);
    expect((await row(media.id))?.state).toBe('uploading');
    expect(await jobs(media.id)).toEqual([]);
  });

  it('moves to processing, enqueues one media job and is a no-op when repeated', async () => {
    const { media } = await create(a);
    await putAll(a, media.id);
    const done = await completed(a, media.id);
    expect(done).toMatchObject({ id: media.id, state: 'processing' });
    expect(await row(media.id)).toMatchObject({ state: 'processing', upload_expires_at: null });
    const expected = [
      { task: 'media_process', queue: 'media', attempts: 3, key: `media:${decodeMedia(media.id)}` },
    ];
    expect(await jobs(media.id)).toEqual(expected);
    expect(await completed(a, media.id)).toEqual(done);
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
    await stored(a, old.id, 2, new Uint8Array(TAIL));
    await stored(b, young.id, 2, new Uint8Array(TAIL));
    const oldKey = (await row(old.id))?.storage_key ?? '';
    const youngKey = (await row(young.id))?.storage_key ?? '';
    await setColumn(old.id, 'created_at', '25 hours');
    await setColumn(young.id, 'created_at', '23 hours');
    const stale = await staging.receive(new Uint8Array(1));
    const fresh = await staging.receive(new Uint8Array(1));
    const past = new Date(Date.now() - 2 * 3_600_000);
    await utimes(stale, past, past);
    expect(
      JSON.parse(
        await collectMedia(fx.db, { staging, store: fx.store, logger: pino({ level: 'silent' }) }),
      ),
    ).toEqual({
      expired: 1,
      purged: 0,
      orphaned: 0,
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
