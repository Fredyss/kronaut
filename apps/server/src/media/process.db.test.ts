import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { installJobQueue } from '../job-queue.ts';
import type { MediaJob } from '../jobs.ts';
import { findMediaAsset } from './dto.ts';
import { type MediaProcessDeps, runMediaProcess } from './process.ts';
import type { Staging } from './staging.ts';
import {
  asUser,
  type MediaDb,
  stagingUnder,
  startMediaDb,
  type Tenant,
  uuidOf,
} from './testing/db.ts';
import { VIDEO_PART_SIZE } from './upload.ts';
import { videoUploadRoute } from './upload-routes.ts';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const CLI: Actor = { kind: 'cli' };

let test: TestDatabase;
let fx: MediaDb;
let owner: Database;
let staging: Staging;
let deps: MediaProcessDeps;
let a: Tenant;
let b: Tenant;
let samples: string;

interface Upload {
  readonly mediaId: string;
  readonly job: MediaJob;
  readonly key: string;
}

interface Row {
  state: string;
  rejected_reason: string | null;
  duplicate_of_id: string | null;
  storage_key: string;
  mime: string | null;
  bytes: string | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  frame_rate_milli: number | null;
  source_sha256: Buffer | null;
  ai_generated: boolean;
  deleted_at: Date | null;
}

function ffmpeg(args: string[]): void {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args]);
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr.toString()}`);
}

async function video(name: string, seconds: number, frequency: number): Promise<Uint8Array> {
  const out = join(samples, `${name}.mp4`);
  ffmpeg([
    ...['-f', 'lavfi', '-i', `testsrc2=size=640x360:rate=30:duration=${seconds}`],
    ...['-f', 'lavfi', '-i', `sine=frequency=${frequency}:duration=${seconds}`],
    ...['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', out],
  ]);
  return new Uint8Array(await readFile(out));
}

async function audioOnly(): Promise<Uint8Array> {
  const out = join(samples, 'audio.mp4');
  ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', '-c:a', 'aac', out]);
  return new Uint8Array(await readFile(out));
}

beforeAll(async () => {
  if (!hasFfmpeg) return;
  test = await startTestDatabase();
  fx = await startMediaDb(test, 'process', { staging: stagingUnder });
  ({ a, b, staging } = fx);
  owner = createDatabase({ connectionString: test.ownerUrl });
  await installJobQueue(test.ownerUrl, owner);
  samples = await mkdtemp(join(tmpdir(), 'kronaut-process-samples-'));
  deps = { db: fx.db, store: fx.store, staging, logger: pino({ level: 'silent' }) };
});

afterAll(async () => {
  await owner?.destroy();
  await fx?.stop();
  await test?.stop();
  if (samples !== undefined) await rm(samples, { recursive: true, force: true });
});

async function send(
  tenant: Tenant,
  method: 'POST' | 'PUT',
  path: string,
  body?: unknown,
): Promise<unknown> {
  const response = await fx.call(tenant, method, path, { body });
  expect(response.ok).toBe(true);
  return await response.json();
}

async function createUpload(tenant: Tenant, bytes: number, aiGenerated = false) {
  const body = { kind: 'video', bytes, mime: 'video/mp4', aiGenerated };
  return videoUploadRoute.response.parse(await send(tenant, 'POST', 'media/uploads', body));
}

function asOwner<T>(fn: Parameters<Database['withActor']>[1]) {
  return owner.withActor(CLI, fn) as Promise<T>;
}

async function row(id: string): Promise<Row> {
  return await asOwner<Row>(async (trx) =>
    trx.selectFrom('media_assets').selectAll().where('id', '=', id).executeTakeFirstOrThrow(),
  );
}

async function upload(tenant: Tenant, data: Uint8Array, aiGenerated = false): Promise<Upload> {
  const { media } = await createUpload(tenant, data.byteLength, aiGenerated);
  for (let part = 1; (part - 1) * VIDEO_PART_SIZE < data.byteLength; part++) {
    const chunk = data.subarray((part - 1) * VIDEO_PART_SIZE, part * VIDEO_PART_SIZE);
    await send(tenant, 'PUT', `media/${media.id}/parts/${part}`, chunk);
  }
  await send(tenant, 'POST', `media/${media.id}/complete`);
  const id = uuidOf(media);
  return {
    mediaId: media.id,
    job: { workspaceId: tenant.workspaceId, id },
    key: (await row(id)).storage_key,
  };
}

async function restage(key: string, data: Uint8Array, sizes: number[]): Promise<void> {
  await staging.remove(key);
  let offset = 0;
  for (const [index, size] of sizes.entries()) {
    const temp = await staging.receive(data.subarray(offset, offset + size));
    await staging.place(temp, key, index + 1);
    offset += size;
  }
  await staging.place(await staging.receive(data.subarray(offset)), key, sizes.length + 1);
}

async function expectGone(key: string): Promise<void> {
  await expect(stat(staging.directory(key))).rejects.toMatchObject({ code: 'ENOENT' });
}

async function expectRejected(data: Uint8Array, reason: string): Promise<void> {
  const { job, key } = await upload(a, data);
  expect(await runMediaProcess(deps, job)).toBe('rejected');
  expect(await row(job.id)).toMatchObject({ state: 'rejected', rejected_reason: reason });
  await expectGone(key);
}

describe.skipIf(!hasFfmpeg)('media process', () => {
  it('converts a video split over many parts into a ready master with a poster', async () => {
    const data = await video('happy', 4, 440);
    const { job, key } = await upload(a, data);
    const step = Math.ceil(data.byteLength / 12);
    await restage(
      key,
      data,
      Array.from({ length: 11 }, () => step),
    );
    expect(await runMediaProcess(deps, job)).toBe('ready');
    const ready = await row(job.id);
    expect(ready).toMatchObject({
      state: 'ready',
      mime: 'video/mp4',
      width: 640,
      height: 360,
      rejected_reason: null,
    });
    expect(Number(ready.bytes)).toBeGreaterThan(0);
    expect(ready.duration_ms).toBeGreaterThan(3900);
    expect(ready.duration_ms).toBeLessThan(4200);
    expect(ready.frame_rate_milli).toBe(30_000);
    const dto = await fx.db.withTenant(a.workspaceId, asUser(a), (trx) =>
      findMediaAsset(trx, a.workspaceId, job.id),
    );
    expect(dto).toMatchObject({ kind: 'video', durationMs: ready.duration_ms, frameRate: 30 });
    expect(ready.source_sha256).toEqual(createHash('sha256').update(data).digest());
    expect(await fx.store.has(ready.storage_key)).toBe(true);
    const renditions = await asOwner<{ purpose: string; mime: string; storage_key: string }[]>(
      (trx) =>
        trx
          .selectFrom('media_renditions')
          .select(['purpose', 'mime', 'storage_key'])
          .where('media_asset_id', '=', job.id)
          .execute(),
    );
    expect(renditions).toMatchObject([{ purpose: 'thumb_768', mime: 'image/webp' }]);
    expect(await fx.store.has(renditions[0]?.storage_key ?? '')).toBe(true);
    await expectGone(key);
  });

  it('rejects a video under 3 s as video_too_short', async () => {
    await expectRejected(await video('short', 2, 440), 'video_too_short');
  });

  it('rejects an audio-only mp4 as video_stream_missing', async () => {
    await expectRejected(await audioOnly(), 'video_stream_missing');
  });

  it('rejects random bytes as video_unreadable', async () => {
    await expectRejected(new Uint8Array(randomBytes(64 * 1024)), 'video_unreadable');
  });

  it('rejects a second upload of the same video as a duplicate of the first', async () => {
    const data = await video('dupe', 4, 500);
    const first = await upload(a, data);
    expect(await runMediaProcess(deps, first.job)).toBe('ready');
    const second = await upload(a, data);
    expect(await runMediaProcess(deps, second.job)).toBe('duplicate');
    expect(await row(second.job.id)).toMatchObject({
      state: 'rejected',
      rejected_reason: 'video_duplicate',
      duplicate_of_id: first.job.id,
    });
    expect((await row(first.job.id)).state).toBe('ready');
    await expectGone(second.key);
  });

  it('revives a soft-deleted original and keeps the AI mark sticky', async () => {
    const data = await video('revive', 4, 600);
    const first = await upload(b, data);
    expect(await runMediaProcess(deps, first.job)).toBe('ready');
    await asOwner(async (trx) =>
      sql`update media_assets set deleted_at = now() where id = ${first.job.id}`.execute(trx),
    );
    const second = await upload(b, data, true);
    expect(await runMediaProcess(deps, second.job)).toBe('duplicate');
    expect(await row(first.job.id)).toMatchObject({
      state: 'ready',
      deleted_at: null,
      ai_generated: true,
    });
    expect((await row(second.job.id)).duplicate_of_id).toBe(first.job.id);
  });

  it('retries a tool failure until the last attempt, then rejects', async () => {
    const data = await video('transient', 4, 650);
    const { job, key } = await upload(a, data);
    const slow = { ...deps, tools: { timeoutMs: 1 } };
    await expect(runMediaProcess(slow, job, false)).rejects.toMatchObject({ kind: 'timeout' });
    expect((await row(job.id)).state).toBe('processing');
    expect(await staging.parts(key)).toEqual(new Map([[1, data.byteLength]]));
    expect(await runMediaProcess(slow, job, true)).toBe('rejected');
    expect(await row(job.id)).toMatchObject({
      state: 'rejected',
      rejected_reason: 'video_unreadable',
    });
    await expectGone(key);
  });

  it('drops the staging files of a video deleted while it was queued', async () => {
    const { job, key } = await upload(a, await video('deleted', 4, 750));
    await asOwner(async (trx) =>
      sql`update media_assets set deleted_at = now() where id = ${job.id}`.execute(trx),
    );
    expect(await runMediaProcess(deps, job)).toBe('skipped');
    await expectGone(key);
  });

  it('throws on missing tools and leaves the row processing with its parts', async () => {
    const data = await video('missing', 4, 700);
    const { job, key } = await upload(a, data);
    const missing = { ...deps, tools: { ffmpeg: '/nonexistent', ffprobe: '/nonexistent' } };
    await expect(runMediaProcess(missing, job)).rejects.toMatchObject({ kind: 'missing' });
    expect((await row(job.id)).state).toBe('processing');
    expect(await staging.parts(key)).toEqual(new Map([[1, data.byteLength]]));
    await staging.remove(key);
  });

  it('skips a row that is not processing', async () => {
    const { media } = await createUpload(a, 10);
    const job = { workspaceId: a.workspaceId, id: uuidOf(media) };
    expect(await runMediaProcess(deps, job)).toBe('skipped');
    expect((await row(job.id)).state).toBe('uploading');
  });

  it('processes the job that complete enqueued', async () => {
    const data = await video('routes', 4, 800);
    const { job, key } = await upload(b, data);
    const payloads = await asOwner<{ payload: MediaJob }[]>(async (trx) => {
      const { rows } = await sql`
        select j.payload from graphile_worker._private_jobs j
          join graphile_worker._private_tasks t on t.id = j.task_id
         where t.identifier = 'media_process' and j.payload->>'id' = ${job.id}
      `.execute(trx);
      return rows;
    });
    expect(payloads).toHaveLength(1);
    const payload = payloads[0]?.payload as MediaJob;
    expect(payload).toEqual(job);
    expect(await runMediaProcess(deps, payload)).toBe('ready');
    expect((await row(job.id)).state).toBe('ready');
    await expectGone(key);
  });
});
