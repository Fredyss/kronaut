import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { encodePublicId } from '@kronaut/core';
import { createDatabase } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_MAX_BODY_BYTES } from '../http/body.ts';
import { type Auth, BASE, expectError, type TestRequest } from '../http/testing.ts';
import { installJobQueue } from '../jobs/job-queue.ts';
import { MEDIA_UPLOAD_BODY_LIMIT } from './routes.ts';
import {
  asUser,
  type MediaDb,
  stagingUnder,
  startMediaDb,
  type Tenant,
  uuidOf,
} from './testing/db.ts';
import { pngFixture } from './testing.ts';
import { VIDEO_PART_SIZE } from './upload.ts';

const PART = 10;
const WRITE_SCOPES = ['media:read', 'media:write'];

interface Probe {
  readonly id: string;
  readonly method: TestRequest['method'];
  readonly write: boolean;
  readonly grants: boolean;
  path(mediaId: string, part?: string): string;
  body?(): unknown;
  fresh?(): Promise<string>;
  readonly raised?: true;
}

let test: TestDatabase;
let fx: MediaDb;
let a: Tenant;
let b: Tenant;
let shared: string;
let sharedImport: string;
let viewer: Auth;
let width = 20;

function nextImage(): Uint8Array {
  width += 1;
  return pngFixture({ width, height: 3 });
}

async function freshImage(aiGenerated = false): Promise<string> {
  return (await fx.ingest(a, nextImage(), undefined, aiGenerated)).id;
}

async function openUpload(bytes: number): Promise<string> {
  const body = { kind: 'video', bytes, mime: 'video/mp4' };
  const response = await fx.call(a, 'POST', 'media/uploads', { body });
  expect(response.status).toBe(201);
  return ((await response.json()) as { media: { id: string } }).media.id;
}

async function filledUpload(): Promise<string> {
  const mediaId = await openUpload(PART);
  const part = new Uint8Array(PART);
  const response = await fx.call(a, 'PUT', `media/${mediaId}/parts/1`, { body: part });
  expect(response.status).toBe(200);
  return mediaId;
}

async function openImport(): Promise<string> {
  const body = { url: 'https://cdn.example.test/photo.jpg' };
  const response = await fx.call(a, 'POST', 'media/imports', { body });
  expect(response.status).toBe(202);
  return ((await response.json()) as { id: string }).id;
}

const ROUTES: readonly Probe[] = [
  {
    id: 'media.upload',
    method: 'POST',
    write: true,
    grants: true,
    raised: true,
    path: () => 'media',
    body: () => ({ dataBase64: Buffer.from(nextImage()).toString('base64') }),
  },
  { id: 'media.get', method: 'GET', write: false, grants: true, path: (id) => `media/${id}` },
  {
    id: 'media.mark_ai',
    method: 'POST',
    write: true,
    grants: true,
    path: (id) => `media/${id}/ai-generated`,
    fresh: freshImage,
  },
  { id: 'media.list', method: 'GET', write: false, grants: true, path: () => 'media' },
  {
    id: 'media.usage',
    method: 'GET',
    write: false,
    grants: true,
    path: (id) => `media/${id}/usage`,
  },
  {
    id: 'media.update',
    method: 'PATCH',
    write: true,
    grants: true,
    path: (id) => `media/${id}`,
    body: () => ({ altText: 'A cat' }),
    fresh: freshImage,
  },
  {
    id: 'media.clear_ai',
    method: 'DELETE',
    write: true,
    grants: false,
    path: (id) => `media/${id}/ai-generated`,
    fresh: () => freshImage(true),
  },
  {
    id: 'media.delete',
    method: 'DELETE',
    write: true,
    grants: false,
    path: (id) => `media/${id}`,
    fresh: freshImage,
  },
  {
    id: 'media.video_upload',
    method: 'POST',
    write: true,
    grants: true,
    path: () => 'media/uploads',
    body: () => ({ kind: 'video', bytes: PART, mime: 'video/mp4' }),
  },
  {
    id: 'media.video_part',
    method: 'PUT',
    write: true,
    grants: true,
    raised: true,
    path: (id, part = '1') => `media/${id}/parts/${part}`,
    body: () => new Uint8Array(PART),
  },
  {
    id: 'media.video_complete',
    method: 'POST',
    write: true,
    grants: true,
    path: (id) => `media/${id}/complete`,
    fresh: filledUpload,
  },
  {
    id: 'media.import_create',
    method: 'POST',
    write: true,
    grants: true,
    path: () => 'media/imports',
    body: () => ({ url: 'https://cdn.example.test/photo.jpg' }),
  },
  {
    id: 'media.import_get',
    method: 'GET',
    write: false,
    grants: true,
    path: (id) => `media/imports/${id === ':mediaId' ? ':importId' : sharedImport}`,
  },
];

const READS = ROUTES.filter((route) => !route.write);
const WRITES = ROUTES.filter((route) => route.write);
const GRANTABLE_WRITES = WRITES.filter((route) => route.grants);
const GRANTABLE = ROUTES.filter((route) => route.grants);
const SESSION_ONLY = ROUTES.filter((route) => !route.grants);
const IDEMPOTENT = WRITES.filter((route) => route.id !== 'media.video_part');
const DEFAULT_LIMITED = WRITES.filter((route) => route.raised !== true);

function url(tenant: Tenant, path: string): string {
  return `${BASE}/v1/workspaces/${encodePublicId('workspace', tenant.workspaceId)}/${path}`;
}

function callAs(auth: Auth, tenant: Tenant, route: Probe) {
  const options = route.body === undefined ? { auth } : { auth, body: route.body() };
  return fx.call(tenant, route.method, route.path(shared), options);
}

function withHeaders(
  method: TestRequest['method'],
  path: string,
  headers: Record<string, string>,
  body?: Uint8Array<ArrayBuffer>,
) {
  const auth = fx.auth(a);
  const cookie = 'cookie' in auth ? auth.cookie : '';
  return fx.app.request(url(a, path), {
    method,
    headers: { cookie, origin: BASE, ...headers },
    ...(body === undefined ? {} : { body }),
  });
}

async function bodyOf(response: Response): Promise<unknown> {
  return response.status === 204 ? undefined : await response.json();
}

beforeAll(async () => {
  test = await startTestDatabase();
  fx = await startMediaDb(test, 'routes', { staging: stagingUnder });
  ({ a, b } = fx);
  const owner = createDatabase({ connectionString: test.ownerUrl });
  await installJobQueue(test.ownerUrl, owner);
  await owner.destroy();
  shared = await freshImage();
  sharedImport = await openImport();
  viewer = await fx.member(a, 'routes-viewer', 'viewer');
});

afterAll(async () => {
  await fx?.stop();
  await test?.stop();
});

describe('authentication and authorization', () => {
  it('probes every media route', () => {
    const served = fx.routes
      .filter(({ route }) => route.tags.includes('media'))
      .map(({ route }) => `${route.id} ${route.method} ${route.path}`)
      .sort();
    const probed = ROUTES.map(
      ({ id, method, path }) =>
        `${id} ${method} /v1/workspaces/:workspaceId/${path(':mediaId', ':part')}`,
    ).sort();
    expect(served).toHaveLength(13);
    expect(probed).toEqual(served);
  });

  it.each(ROUTES)('$id answers 401 without a credential', async (route) => {
    const target = url(a, route.path(shared));
    const anonymous = await fx.app.request(target, { method: route.method });
    await expectError(anonymous, 401, 'unauthenticated');
    const forged = await fx.app.request(target, {
      method: route.method,
      headers: { authorization: 'Bearer kro_nope' },
    });
    await expectError(forged, 401, 'unauthenticated');
  });

  it.each(ROUTES)('$id hides a workspace the session is no member of', async (route) => {
    await expectError(await callAs(fx.auth(a), b, route), 404, 'not_found');
  });

  it.each(GRANTABLE)('$id hides a workspace the grant does not belong to', async (route) => {
    const { auth } = await fx.grant(a, WRITE_SCOPES);
    await expectError(await callAs(auth, b, route), 404, 'not_found');
  });

  it.each(SESSION_ONLY)('$id refuses a grant as unauthenticated', async (route) => {
    const { auth } = await fx.grant(a, WRITE_SCOPES);
    await expectError(await callAs(auth, a, route), 401, 'unauthenticated');
  });

  it.each(READS)('$id serves a viewer', async (route) => {
    expect((await callAs(viewer, a, route)).status).toBe(200);
  });

  it.each(WRITES)('$id refuses a viewer', async (route) => {
    const error = await expectError(await callAs(viewer, a, route), 403, 'forbidden');
    expect(error.details).toEqual([{ path: 'authorization', code: 'not_permitted' }]);
  });

  it.each(GRANTABLE_WRITES)('$id refuses a grant without media:write', async (route) => {
    const { auth } = await fx.grant(a, ['media:read']);
    const error = await expectError(await callAs(auth, a, route), 403, 'forbidden');
    expect(error.details).toEqual([{ path: 'authorization', code: 'scope_missing' }]);
  });

  it.each(READS)('$id refuses a grant restricted to a scope', async (route) => {
    const { auth } = await fx.grant(a, ['media:read', 'posts:read'], true);
    await expectError(await callAs(auth, a, route), 403, 'forbidden');
  });

  it.each(GRANTABLE_WRITES)('$id refuses a write grant restricted to a scope', async (route) => {
    const { auth } = await fx.grant(a, WRITE_SCOPES, true);
    const error = await expectError(await callAs(auth, a, route), 403, 'forbidden');
    expect(error.details).toEqual([{ path: 'authorization', code: 'out_of_scope' }]);
  });
});

describe('idempotency', () => {
  it.each(IDEMPOTENT)('$id replays the first response for the same key', async (route) => {
    const mediaId = (await route.fresh?.()) ?? shared;
    const body = route.body?.();
    const key = randomUUID();
    const send = () => fx.call(a, route.method, route.path(mediaId), { body, key });
    const first = await send();
    expect(first.ok).toBe(true);
    expect(first.headers.get('idempotent-replayed')).toBeNull();
    const firstBody = await bodyOf(first);
    const second = await send();
    expect(second.headers.get('idempotent-replayed')).toBe('true');
    expect(second.status).toBe(first.status);
    expect(await bodyOf(second)).toEqual(firstBody);
  });

  it.each(IDEMPOTENT)('$id needs an Idempotency-Key', async (route) => {
    const response = await withHeaders(
      route.method,
      route.path(shared),
      route.body === undefined ? {} : { 'content-type': 'application/json' },
      route.body === undefined ? undefined : new TextEncoder().encode(JSON.stringify(route.body())),
    );
    await expectError(response, 428, 'idempotency_key_required');
  });

  it('refuses a key reused for a different request', async () => {
    const key = randomUUID();
    const send = (bytes: number) => {
      const body = { kind: 'video', bytes, mime: 'video/mp4' };
      return fx.call(a, 'POST', 'media/uploads', { body, key });
    };
    expect((await send(PART)).status).toBe(201);
    await expectError(await send(PART + 1), 409, 'idempotency_key_reused');
  });
});

describe('body limits', () => {
  const overDefault = new Uint8Array(DEFAULT_MAX_BODY_BYTES + 1);
  const garbage = Buffer.alloc(DEFAULT_MAX_BODY_BYTES, 1).toString('base64');
  const bodyOfSize = (bytes: number) => ({
    dataBase64: 'A'.repeat(bytes - JSON.stringify({ dataBase64: '' }).length),
  });

  it.each(DEFAULT_LIMITED)('$id keeps the default limit', async (route) => {
    const response = await fx.call(a, route.method, route.path(shared), { body: overDefault });
    await expectError(response, 413, 'payload_too_large');
  });

  it('lets media.upload past the default limit up to its own', async () => {
    const accepted = await fx.call(a, 'POST', 'media', { body: { dataBase64: garbage } });
    await expectError(accepted, 415, 'unsupported_media_type');
    const whole = bodyOfSize(MEDIA_UPLOAD_BODY_LIMIT);
    await expectError(await fx.call(a, 'POST', 'media', { body: whole }), 400, 'invalid_request');
    const over = bodyOfSize(MEDIA_UPLOAD_BODY_LIMIT + 1);
    await expectError(await fx.call(a, 'POST', 'media', { body: over }), 413, 'payload_too_large');
  });

  it('lets media.video_part take a whole part and no more', async () => {
    const mediaId = await openUpload(VIDEO_PART_SIZE);
    const path = `media/${mediaId}/parts/1`;
    const whole = await fx.call(a, 'PUT', path, { body: new Uint8Array(VIDEO_PART_SIZE) });
    expect(whole.status).toBe(200);
    expect(await whole.json()).toEqual({ part: 1, bytes: VIDEO_PART_SIZE });
    const over = await fx.call(a, 'PUT', path, { body: new Uint8Array(VIDEO_PART_SIZE + 1) });
    await expectError(over, 413, 'payload_too_large');
  });

  it('checks the caller before reading a body past the default limit', async () => {
    const body = bodyOfSize(MEDIA_UPLOAD_BODY_LIMIT + 1);
    const target = url(a, 'media');
    const anonymous = await fx.app.request(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    await expectError(anonymous, 401, 'unauthenticated');
    await expectError(await fx.call(a, 'POST', 'media', { body, auth: viewer }), 403, 'forbidden');
  });

  it('keeps the default limit for a caller the route has not fully allowed', async () => {
    const { auth } = await fx.grant(a, WRITE_SCOPES, true);
    const response = await fx.call(a, 'POST', 'media', { body: { dataBase64: garbage }, auth });
    await expectError(response, 413, 'payload_too_large');
  });
});

describe('media.video_part body', () => {
  it('stores the application/octet-stream bytes as sent', async () => {
    const mediaId = await openUpload(PART);
    const part = Uint8Array.from({ length: PART }, (_, index) => index + 1);
    const response = await fx.call(a, 'PUT', `media/${mediaId}/parts/1`, { body: part });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ part: 1, bytes: PART });
    const row = await fx.db.withTenant(a.workspaceId, asUser(a), (trx) =>
      trx
        .selectFrom('media_assets')
        .select('storage_key')
        .where('id', '=', uuidOf({ id: mediaId }))
        .executeTakeFirstOrThrow(),
    );
    const file = await readFile(join(fx.staging.directory(row.storage_key), '1.part'));
    expect(new Uint8Array(file)).toEqual(part);
  });

  it('takes no Idempotency-Key and refuses any other content type or an empty body', async () => {
    const mediaId = await openUpload(PART);
    const path = `media/${mediaId}/parts/1`;
    const bytes = new Uint8Array(PART);
    const octet = { 'content-type': 'application/octet-stream' };
    expect((await withHeaders('PUT', path, octet, bytes)).status).toBe(200);
    const json = await withHeaders('PUT', path, { 'content-type': 'application/json' }, bytes);
    await expectError(json, 415, 'unsupported_media_type');
    await expectError(await withHeaders('PUT', path, {}, bytes), 415, 'unsupported_media_type');
    await expectError(await withHeaders('PUT', path, octet), 400, 'invalid_request');
  });
});
