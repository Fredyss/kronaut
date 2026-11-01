import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { createHttpClient, EgressError } from '@kronaut/egress';
import { runOnce } from 'graphile-worker';
import { sql } from 'kysely';
import pino from 'pino';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { expectError } from '../http/testing.ts';
import { installJobQueue, jobLogger } from '../job-queue.ts';
import { JOBS } from '../jobs.ts';
import { collectMedia } from './gc.ts';
import { MEDIA_IMPORT_EGRESS, mediaImportTask, runMediaImport } from './import.ts';
import { importBucketKey, MEDIA_IMPORTS_PER_HOUR } from './import-store.ts';
import { type MediaDb, stagingUnder, startMediaDb, type Tenant } from './testing/db.ts';
import {
  capturedLogger,
  importDeps,
  importRow,
  LINK,
  type Reply,
  SYSTEM,
  scriptedHttp,
  startImport,
} from './testing/import.ts';
import { pngFixture } from './testing.ts';
import { VIDEO_PART_SIZE } from './upload.ts';

const CLI: Actor = { kind: 'cli' };
const CANARY = 'CANARY_import_token_31337';
const silent = pino({ level: 'silent' });

let test: TestDatabase;
let fx: MediaDb;
let owner: Database;
let a: Tenant;
let b: Tenant;

beforeAll(async () => {
  test = await startTestDatabase();
  fx = await startMediaDb(test, 'import', { staging: stagingUnder });
  ({ a, b } = fx);
  owner = createDatabase({ connectionString: test.ownerUrl });
  await installJobQueue(test.ownerUrl, owner);
});

afterAll(async () => {
  await owner?.destroy();
  await fx?.stop();
  await test?.stop();
});

function mp4(bytes: number): Uint8Array {
  const out = new Uint8Array(bytes).fill(7);
  out.set([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]);
  return out;
}

function deps(http: ReturnType<typeof scriptedHttp>, logger = silent) {
  return importDeps(fx, http, logger);
}

function assetOf(workspaceId: string, id: string | null) {
  return fx.db.withTenant(workspaceId, SYSTEM, (trx) =>
    trx
      .selectFrom('media_assets')
      .selectAll()
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', id ?? '')
      .executeTakeFirst(),
  );
}

async function assetCount(workspaceId: string): Promise<number> {
  const rows = await fx.db.withTenant(workspaceId, SYSTEM, (trx) =>
    trx.selectFrom('media_assets').select('id').where('workspace_id', '=', workspaceId).execute(),
  );
  return rows.length;
}

async function queued(task: string, id: string) {
  return await owner.withActor(CLI, async (trx) => {
    const { rows } = await sql<{ payload: unknown; last_error: string | null; queue: string }>`
      select j.payload, j.last_error, q.queue_name as queue
        from graphile_worker._private_jobs j
        join graphile_worker._private_tasks t on t.id = j.task_id
        left join graphile_worker._private_job_queues q on q.id = j.job_queue_id
       where t.identifier = ${task} and j.payload->>'id' = ${id}
    `.execute(trx);
    return rows;
  });
}

describe('creating an import', () => {
  beforeEach(async () => {
    await owner.withActor(CLI, (trx) => trx.deleteFrom('rate_buckets').execute());
  });

  it('answers 202, stores the row and queues ids only, and never returns the URL', async () => {
    const url = `${LINK}?token=${CANARY}`;
    const response = await fx.call(a, 'POST', 'media/imports', {
      body: { url },
      key: 'create-import-1',
    });
    expect(response.status).toBe(202);
    const text = await response.text();
    expect(text).not.toContain(CANARY);
    const { id, ...rest } = JSON.parse(text) as { id: string };
    expect(id).toMatch(/^mimp_/);
    expect(rest).toEqual({ state: 'pending', error: null, media: null });

    const read = await fx.call(a, 'GET', `media/imports/${id}`);
    expect(read.status).toBe(200);
    expect(await read.text()).not.toContain(CANARY);
  });

  it('records the requester and queues the job on its own queue', async () => {
    const { job } = await startImport(fx, a);
    const row = await importRow(fx.db, job);
    expect(row).toMatchObject({
      state: 'pending',
      url: LINK,
      ai_generated: false,
      requested_by_user_id: a.userId,
      requested_by_grant_id: null,
    });
    expect(await queued(JOBS.mediaImport, job.id)).toEqual([
      {
        payload: { workspaceId: job.workspaceId, id: job.id },
        last_error: null,
        queue: 'media-import',
      },
    ]);
  });

  it('refuses anything but a plain https link', async () => {
    const long = `https://cdn.example.test/${'a'.repeat(2048)}`;
    const urls = ['http://cdn.example.test/a.jpg', 'https://u:p@cdn.example.test/a.jpg', 'x', long];
    for (const [index, url] of urls.entries()) {
      const response = await fx.call(a, 'POST', 'media/imports', {
        body: { url },
        key: `bad-url-${index}-key`,
      });
      const error = await expectError(response, 400, 'invalid_request');
      expect(error.details).toEqual([{ path: 'body.url', code: 'url_invalid' }]);
    }
  });

  it('answers 429 over the quota and creates nothing', async () => {
    await startImport(fx, b);
    await owner.withActor(CLI, (trx) =>
      trx
        .updateTable('rate_buckets')
        .set({ tokens: 0 })
        .where('key', '=', importBucketKey(b.workspaceId))
        .execute(),
    );
    const response = await fx.call(b, 'POST', 'media/imports', {
      body: { url: LINK },
      key: 'quota-import-1',
    });
    await expectError(response, 429, 'rate_limited');
    const bucket = await owner.withActor(CLI, (trx) =>
      trx
        .selectFrom('rate_buckets')
        .select(['capacity', 'window_secs'])
        .where('key', '=', importBucketKey(b.workspaceId))
        .executeTakeFirstOrThrow(),
    );
    expect(Number(bucket.capacity)).toBe(MEDIA_IMPORTS_PER_HOUR);
    expect(bucket.window_secs).toBe(3600);
  });

  it('enforces the scope and keeps imports inside their workspace', async () => {
    const readOnly = await fx.grant(a, ['media:read']);
    const denied = await fx.call(a, 'POST', 'media/imports', {
      body: { url: LINK },
      key: 'scope-import-1',
      auth: readOnly.auth,
    });
    expect(denied.status).toBe(403);

    const { publicId } = await startImport(fx, a);
    const restricted = await fx.grant(a, ['media:read'], true);
    const scoped = await fx.call(a, 'GET', `media/imports/${publicId}`, { auth: restricted.auth });
    await expectError(scoped, 403, 'forbidden');

    await expectError(await fx.call(b, 'GET', `media/imports/${publicId}`), 404, 'not_found');
    const foreign = await fx.call(a, 'GET', `media/imports/${publicId}`, { auth: fx.auth(b) });
    expect(foreign.status).toBe(404);
  });
});

describe('running an import', () => {
  it('imports an image as the grant that asked, and clears the URL', async () => {
    const grant = await fx.grant(a, ['media:write', 'media:read']);
    const started = await startImport(fx, a, { aiGenerated: true, auth: grant.auth });
    const http = scriptedHttp({ chunks: [pngFixture({ width: 2, height: 2 })] });

    expect(await runMediaImport(deps(http), started.job)).toBe('done');

    expect(http.urls).toEqual([LINK]);
    expect(http.discarded).toBe(1);
    const row = await importRow(fx.db, started.job);
    expect(row).toMatchObject({ state: 'done', url: null, error: null });
    expect(row?.finished_at).not.toBeNull();
    const asset = await assetOf(a.workspaceId, row?.media_id ?? null);
    expect(asset).toMatchObject({
      state: 'ready',
      ai_generated: true,
      ai_locked: true,
      uploaded_by_grant_id: grant.id,
      uploaded_by_user_id: null,
      original_name: 'photo.jpg',
    });
    const read = await fx.call(a, 'GET', `media/imports/${started.publicId}`);
    expect(await read.json()).toMatchObject({ state: 'done', media: { kind: 'image' } });
  });

  it('skips a finished import', async () => {
    const { job } = await startImport(fx, a);
    await runMediaImport(deps(scriptedHttp({ status: 404 })), job);
    const http = scriptedHttp();
    expect(await runMediaImport(deps(http), job)).toBe('skipped');
    expect(http.urls).toEqual([]);
  });

  it('stages a video of unknown length in exact parts and queues the conversion', async () => {
    const started = await startImport(fx, a, { url: 'https://cdn.example.test/clip.mp4' });
    const body = mp4(2 * VIDEO_PART_SIZE + 100);
    const cuts = [1000, VIDEO_PART_SIZE, 2 * VIDEO_PART_SIZE - 5, body.byteLength];
    const chunks = cuts.map((end, index) => body.subarray(cuts[index - 1] ?? 0, end));

    expect(await runMediaImport(deps(scriptedHttp({ chunks })), started.job)).toBe('done');

    const row = await importRow(fx.db, started.job);
    expect(row).toMatchObject({ state: 'done', url: null });
    const asset = await assetOf(a.workspaceId, row?.media_id ?? null);
    expect(asset).toMatchObject({
      kind: 'video',
      state: 'processing',
      bytes: String(body.byteLength),
      original_name: 'clip.mp4',
      uploaded_by_user_id: a.userId,
    });
    const key = asset?.storage_key ?? '';
    const parts = await fx.staging.parts(key);
    expect([...parts.entries()].sort(([x], [y]) => x - y)).toEqual([
      [1, VIDEO_PART_SIZE],
      [2, VIDEO_PART_SIZE],
      [3, 100],
    ]);
    const staged = await Promise.all(
      [1, 2, 3].map((part) => readFile(join(fx.staging.directory(key), `${part}.part`))),
    );
    expect(Buffer.concat(staged).equals(Buffer.from(body))).toBe(true);
    expect(await queued(JOBS.mediaProcess, row?.media_id ?? '')).toHaveLength(1);
  });

  it('takes WebM by its magic bytes and a video of exactly one part', async () => {
    const { job } = await startImport(fx, a, { url: 'https://cdn.example.test/watch?v=abc' });
    const body = new Uint8Array(VIDEO_PART_SIZE).fill(1);
    body.set([0x1a, 0x45, 0xdf, 0xa3]);

    await runMediaImport(deps(scriptedHttp({ chunks: [body] })), job);

    const row = await importRow(fx.db, job);
    const asset = await assetOf(a.workspaceId, row?.media_id ?? null);
    expect(asset).toMatchObject({ state: 'processing', original_name: null });
    expect((await fx.staging.parts(asset?.storage_key ?? '')).get(1)).toBe(VIDEO_PART_SIZE);
  });

  it.each([
    ['unknown bytes', { chunks: [new Uint8Array(64).fill(9)] }, 'unsupported_type'],
    ['an empty body', { chunks: [] }, 'unsupported_type'],
    ['a truncated image', { chunks: [pngFixture().subarray(0, 20)] }, 'file_corrupt'],
    ['a 404', { status: 404 }, 'fetch_failed'],
    ['a timeout', { error: new EgressError('timeout') }, 'timed_out'],
    ['a timeout mid-body', { tail: new EgressError('timeout') }, 'timed_out'],
    ['too many redirects', { error: new EgressError('too_many_redirects') }, 'url_blocked'],
    ['an oversize body', { error: new EgressError('response_too_large') }, 'file_too_large'],
  ])('fails %s on the first attempt', async (_, reply, kind) => {
    const { job } = await startImport(fx, a);
    const before = await assetCount(a.workspaceId);
    const http = scriptedHttp(reply);

    expect(await runMediaImport(deps(http), job, false)).toBe('failed');

    expect(await importRow(fx.db, job)).toMatchObject({ state: 'failed', error: kind, url: null });
    expect(await assetCount(a.workspaceId)).toBe(before);
    expect(http.discarded).toBe('error' in reply ? 0 : 1);
  });

  it('refuses an image over the upload limit', async () => {
    const { job } = await startImport(fx, a);
    const png = new Uint8Array(VIDEO_PART_SIZE + 1);
    png.set(pngFixture());
    await runMediaImport(deps(scriptedHttp({ chunks: [png] })), job, false);
    expect(await importRow(fx.db, job)).toMatchObject({ state: 'failed', error: 'file_too_large' });
  });

  it.each([
    ['a 503', { status: 503 }],
    ['a 429', { status: 429 }],
    ['a network error', { error: new EgressError('network') }],
    ['a DNS failure', { error: new EgressError('dns_failure') }],
    ['an unknown error', { error: new Error('disk full') }],
  ])('retries %s, then fails on the final attempt', async (_, reply) => {
    const { job } = await startImport(fx, a);

    await expect(runMediaImport(deps(scriptedHttp(reply)), job, false)).rejects.toThrow(
      /^fetch_failed$/,
    );
    expect(await importRow(fx.db, job)).toMatchObject({ state: 'fetching', url: LINK });

    expect(await runMediaImport(deps(scriptedHttp(reply)), job, true)).toBe('failed');
    expect(await importRow(fx.db, job)).toMatchObject({
      state: 'failed',
      error: 'fetch_failed',
      url: null,
    });
  });

  it('leaves no asset and no staged parts when a video fails', async () => {
    const before = await assetCount(a.workspaceId);
    const started = await startImport(fx, a);
    const reply = { chunks: [mp4(2 * VIDEO_PART_SIZE + 10)], tail: new EgressError('network') };
    const seen: string[] = [];
    const staging = {
      ...fx.staging,
      place: (temp: string, key: string, part: number) => {
        seen.push(key);
        return fx.staging.place(temp, key, part);
      },
    };

    await expect(
      runMediaImport({ ...deps(scriptedHttp(reply)), staging }, started.job, false),
    ).rejects.toThrow(/^fetch_failed$/);

    expect(seen.length).toBeGreaterThan(0);
    expect(await assetCount(a.workspaceId)).toBe(before);
    expect((await fx.staging.parts(seen[0] ?? '')).size).toBe(0);
  });

  it('NET-02 media_import_url_private: a private or loopback address is never fetched', async () => {
    const resolver = async () => [{ address: '10.0.0.8', family: 4 as const }];
    const http = createHttpClient(MEDIA_IMPORT_EGRESS, { resolver });
    for (const url of ['https://127.0.0.1/a.jpg', 'https://intranet.example.test/a.jpg']) {
      const { job } = await startImport(fx, a, { url });
      expect(await runMediaImport(importDeps(fx, http, silent), job, false)).toBe('failed');
      expect(await importRow(fx.db, job)).toMatchObject({ state: 'failed', error: 'url_blocked' });
    }
  });

  it('keeps a filename only when it is a real media file name', async () => {
    const names = [
      ['photo%20one.jpg', 'photo one.jpg'],
      ['aGVsbG8tdG9rZW4', null],
      ['bad%E0%A4%A.png', null],
      ['line%0Abreak.png', null],
      ['SHOUT.PNG', 'SHOUT.PNG'],
    ] as const;
    for (const [segment, expected] of names) {
      const url = `https://cdn.example.test/files/${segment}`;
      const { job } = await startImport(fx, b, { url });
      const png = pngFixture({ width: 3 + names.findIndex(([s]) => s === segment), height: 1 });
      await runMediaImport(deps(scriptedHttp({ chunks: [png] })), job);
      const row = await importRow(fx.db, job);
      expect(row?.state).toBe('done');
      const asset = await assetOf(b.workspaceId, row?.media_id ?? null);
      expect(asset?.original_name).toBe(expected);
    }
  });
});

describe('secrecy of the URL', () => {
  const url = `https://cdn.example.test/${CANARY}?token=${CANARY}`;

  beforeEach(async () => {
    await owner.withActor(CLI, (trx) =>
      sql`delete from graphile_worker._private_jobs`.execute(trx),
    );
  });

  async function runQueued(reply: Reply) {
    const { logger, lines } = capturedLogger();
    await runOnce({
      connectionString: test.ownerUrl,
      logger: jobLogger(logger),
      noHandleSignals: true,
      taskList: {
        [JOBS.mediaImport]: mediaImportTask(deps(scriptedHttp(reply), logger)),
      },
    });
    return lines;
  }

  it('stays out of the logs and the queue after a retryable failure', async () => {
    const { job } = await startImport(fx, a, { url });
    const leak = new Error(`connect failed for ${url}`, { cause: new Error(url) });

    const lines = await runQueued({ error: leak });

    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join('')).not.toContain(CANARY);
    const [entry] = await queued(JOBS.mediaImport, job.id);
    expect(entry?.last_error).toContain('fetch_failed');
    expect(JSON.stringify(entry)).not.toContain(CANARY);
    expect(await importRow(fx.db, job)).toMatchObject({ state: 'fetching' });
  });

  it('stays out of the logs and the queue after success, and off the row', async () => {
    await owner.withActor(CLI, (trx) =>
      sql`delete from graphile_worker._private_jobs`.execute(trx),
    );
    const { job } = await startImport(fx, a, { url });

    const lines = await runQueued({ chunks: [pngFixture({ width: 9, height: 9 })] });

    expect(lines.join('')).not.toContain(CANARY);
    expect(JSON.stringify(await queued(JOBS.mediaImport, job.id))).not.toContain(CANARY);
    expect(await importRow(fx.db, job)).toMatchObject({ state: 'done', url: null });
  });

  it('fails permanently without leaking the URL', async () => {
    const { job } = await startImport(fx, a, { url });
    const { logger, lines } = capturedLogger();
    const http = scriptedHttp({ error: new EgressError('blocked_address', url) });

    await runMediaImport(importDeps(fx, http, logger), job, false);

    expect(lines.join('')).not.toContain(CANARY);
    expect(await importRow(fx.db, job)).toMatchObject({ state: 'failed', url: null });
  });
});

describe('garbage collection', () => {
  const gc = () =>
    collectMedia(fx.db, { staging: fx.staging, store: fx.store, logger: silent }).then(
      (out) => JSON.parse(out) as { importsStalled: number; importsDeleted: number },
    );

  async function age(id: string, values: { created: string; finished?: string }) {
    await owner.withActor(CLI, (trx) =>
      sql`
        update media_imports
           set created_at = now() - ${values.created}::interval,
               finished_at = case when finished_at is null then null
                                  else now() - ${values.finished ?? '0'}::interval end
         where id = ${id}
      `.execute(trx),
    );
  }

  it('stalls open imports past 24 h and deletes finished ones past 7 days', async () => {
    const stuck = await startImport(fx, a);
    const fresh = await startImport(fx, a);
    const old = await startImport(fx, a);
    const recent = await startImport(fx, a);
    await runMediaImport(deps(scriptedHttp({ status: 404 })), old.job);
    await runMediaImport(deps(scriptedHttp({ status: 404 })), recent.job);
    await age(stuck.job.id, { created: '25 hours' });
    await age(old.job.id, { created: '9 days', finished: '8 days' });
    await age(recent.job.id, { created: '9 days', finished: '6 days' });

    expect(await gc()).toMatchObject({ importsStalled: 1, importsDeleted: 1 });

    expect(await importRow(fx.db, stuck.job)).toMatchObject({
      state: 'failed',
      error: 'stalled',
      url: null,
    });
    expect(await importRow(fx.db, fresh.job)).toMatchObject({ state: 'pending', url: LINK });
    expect(await importRow(fx.db, old.job)).toBeUndefined();
    expect(await importRow(fx.db, recent.job)).toMatchObject({ state: 'failed' });
  });

  it('nulls media_id when the asset is deleted', async () => {
    const { job } = await startImport(fx, a);
    const png = pngFixture({ width: 21, height: 21 });
    await runMediaImport(deps(scriptedHttp({ chunks: [png] })), job);
    const before = await importRow(fx.db, job);
    await owner.withActor(CLI, (trx) =>
      trx
        .deleteFrom('media_assets')
        .where('id', '=', before?.media_id ?? '')
        .execute(),
    );
    expect(await importRow(fx.db, job)).toMatchObject({ state: 'done', media_id: null });
  });
});
