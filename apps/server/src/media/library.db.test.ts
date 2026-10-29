import { randomBytes, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { authorize, encodePublicId, type Principal } from '@kronaut/core';
import { type Actor, createDatabase, type TenantDb } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { storageKey } from '@kronaut/media';
import { sql } from 'kysely';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { denyError } from '../http/errors.ts';
import type { RequestContext } from '../http/types.ts';
import type { ResolvedItem } from '../posts/items.ts';
import { insertVariant } from '../posts/variants.ts';
import {
  asUser,
  MEDIA_BASE,
  type MediaDb,
  NOW,
  signer,
  startMediaDb,
  type Tenant,
  uuidOf,
} from './db-testing.ts';
import { collectMedia } from './gc.ts';
import { ingestImage, prepareImage } from './ingest.ts';
import { removeIfUnreferenced } from './key-lock.ts';
import {
  libraryRoutes,
  mediaClearAiRoute,
  mediaDeleteRoute,
  mediaListRoute,
  mediaUsageRoute,
} from './library-routes.ts';
import { finishMedia, StoredObjectMissing } from './process-finish.ts';
import { mediaMarkAiRoute, mediaRoutes } from './routes.ts';
import { createStaging } from './staging.ts';
import { expectMediaError, jpegFixture, pngFixture } from './testing.ts';

let test: TestDatabase;
let fx: MediaDb;
let a: Tenant;
let grantId: string;

beforeAll(async () => {
  test = await startTestDatabase();
  fx = await startMediaDb(test, 'library');
  ({ a } = fx);
  const owner = createDatabase({ connectionString: test.ownerUrl });
  grantId = await owner.withActor({ kind: 'cli' }, async (trx) => {
    const row = await trx
      .insertInto('access_grants')
      .values({
        workspace_id: a.workspaceId,
        kind: 'api_key',
        name: 'Agent',
        sponsor_user_id: a.userId,
        scopes: ['media:read', 'media:write'],
        resource_scope: 'workspace',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return row.id;
  });
  await owner.destroy();
});

afterAll(async () => {
  await fx?.stop();
  await test?.stop();
});

function member(tenant: Tenant): Principal {
  return {
    kind: 'user',
    userId: tenant.userId,
    workspaceId: tenant.workspaceId,
    role: 'owner',
    canApprove: true,
    restricted: false,
    authenticatedAt: NOW,
  };
}

function agent(): Principal {
  return {
    kind: 'grant',
    grantId,
    workspaceId: a.workspaceId,
    sponsorUserId: a.userId,
    sponsorRole: 'owner',
    scopes: ['media:read', 'media:write'],
    restricted: false,
  };
}

function context(tenant: Tenant, principal: Principal = member(tenant)): RequestContext {
  const actor: Actor =
    principal.kind === 'grant' ? { kind: 'grant', id: principal.grantId } : asUser(tenant);
  return {
    requestId: randomUUID(),
    principal,
    session: null,
    now: NOW,
    logger: pino({ level: 'silent' }),
    ipPrefix: null,
    acceptLanguage: null,
    tenant: (fn) => fx.db.withTenant(tenant.workspaceId, actor, fn),
    authorize: (action, resource) => {
      const decision = authorize(principal, action, resource, { now: NOW });
      if (decision.kind === 'deny') throw denyError(decision.code);
      if (decision.kind === 'require_approval') throw new Error('approval not expected');
      return decision;
    },
    cookie: () => undefined,
    setCookie: () => undefined,
    clearCookie: () => undefined,
  };
}

function bound(route: { readonly id: string }) {
  const found = libraryRoutes({ signer }).find((candidate) => candidate.route.id === route.id);
  if (found === undefined) throw new Error(`route ${route.id} missing`);
  return found;
}

function params(asset: { id: string }) {
  return { workspaceId: encodePublicId('workspace', a.workspaceId), mediaId: asset.id };
}

function run(route: { readonly id: string }, asset: { id: string }, principal?: Principal) {
  return bound(route).handler(
    { params: params(asset), query: undefined, body: undefined },
    context(a, principal),
  );
}

async function ingestAsAgent(data: Uint8Array) {
  const prepared = await prepareImage({ bytes: data });
  const target = { workspaceId: a.workspaceId, aiGenerated: true };
  return await fx.db.withTenant(a.workspaceId, { kind: 'grant', id: grantId }, (trx) =>
    ingestImage(trx, fx.store, target, prepared),
  );
}

function tenant<T>(fn: (trx: TenantDb) => Promise<T>): Promise<T> {
  return fx.db.withTenant(a.workspaceId, asUser(a), fn);
}

async function postUsing(asset: { id: string }): Promise<string> {
  return await tenant(async (trx) => {
    const { id: postId } = await trx
      .insertInto('posts')
      .values({
        workspace_id: a.workspaceId,
        title: 'Launch',
        schedule_mode: 'unscheduled',
        origin: 'ui',
        created_by_user_id: a.userId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const item: ResolvedItem = {
      role: 'main',
      doc: { type: 'doc', content: [{ type: 'paragraph' }] },
      media: [{ assetId: uuidOf(asset), altText: null }],
    };
    await insertVariant(trx, { workspaceId: a.workspaceId, postId }, true, [item]);
    return postId;
  });
}

async function setColumn(asset: { id: string }, column: string, value: unknown) {
  await tenant((trx) =>
    sql`update media_assets set ${sql.ref(column)} = ${value} where id = ${uuidOf(asset)}`.execute(
      trx,
    ),
  );
}

async function keyOf(asset: { id: string }): Promise<string> {
  const row = await tenant((trx) =>
    trx
      .selectFrom('media_assets')
      .select('storage_key')
      .where('id', '=', uuidOf(asset))
      .executeTakeFirstOrThrow(),
  );
  return row.storage_key;
}

async function auditActions(asset: { id: string }): Promise<string[]> {
  const rows = await tenant((trx) =>
    trx
      .selectFrom('audit_events')
      .select('action')
      .where('resource_id', '=', uuidOf(asset))
      .orderBy('occurred_at')
      .execute(),
  );
  return rows.map((row) => row.action);
}

describe('media library', () => {
  it('refuses to delete an asset that a post uses and deletes it once unused', async () => {
    const used = await fx.ingest(a, pngFixture({ width: 6, height: 6 }));
    const unused = await fx.ingest(a, pngFixture({ width: 7, height: 7 }));
    const postId = await postUsing(used);

    const rejected = await fx.ingest(a, pngFixture({ width: 5, height: 5 }));
    await setColumn(rejected, 'state', 'rejected');
    const list = await bound(mediaListRoute).handler(
      { params: params(used), query: { kind: 'image' }, body: undefined },
      context(a),
    );
    const page = mediaListRoute.response.parse(list.body).items;
    expect(page.map((item) => item.id)).not.toContain(rejected.id);
    expect(page.find((item) => item.id === used.id)?.previewUrl).toMatch(
      new RegExp(`^${MEDIA_BASE}/m/[0-9a-f]{64}\\?exp=`),
    );
    const counts = new Map(page.map((item) => [item.id, item.usageCount]));
    expect(counts.get(used.id)).toBe(1);
    expect(counts.get(unused.id)).toBe(0);
    const usage = await run(mediaUsageRoute, used);
    expect(mediaUsageRoute.response.parse(usage.body).items).toEqual([
      {
        postId: encodePublicId('post', postId),
        title: 'Launch',
        excerpt: '',
        publishSummary: 'draft',
        scheduledAt: null,
      },
    ]);

    await expectMediaError(run(mediaDeleteRoute, used), 'media_in_use', 409);
    expect(await auditActions(used)).toEqual([]);

    await run(mediaDeleteRoute, unused);
    const after = await bound(mediaListRoute).handler(
      { params: params(used), query: {}, body: undefined },
      context(a),
    );
    const ids = mediaListRoute.response.parse(after.body).items.map((item) => item.id);
    expect(ids).not.toContain(unused.id);
    expect(ids).toContain(used.id);
    expect(await auditActions(unused)).toEqual(['media.deleted']);
  });

  it('clears the AI label of a member upload but never one a grant uploaded or marked', async () => {
    const own = await fx.ingest(a, jpegFixture({ width: 8, height: 8 }), undefined, true);
    const uploaded = await ingestAsAgent(jpegFixture({ width: 9, height: 9 }));
    const marked = await fx.ingest(a, jpegFixture({ width: 10, height: 10 }));
    const mark = mediaRoutes({ store: fx.store, signer, clock: () => NOW }).find(
      (candidate) => candidate.route === mediaMarkAiRoute,
    );
    await mark?.handler(
      { params: params(marked), query: undefined, body: undefined },
      context(a, agent()),
    );
    const duplicateBytes = jpegFixture({ width: 11, height: 11 });
    const duplicated = await fx.ingest(a, duplicateBytes);
    expect((await ingestAsAgent(duplicateBytes)).id).toBe(duplicated.id);

    for (const locked of [uploaded, marked, duplicated]) {
      await expectMediaError(run(mediaClearAiRoute, locked), 'conflict', 409);
    }
    const cleared = await run(mediaClearAiRoute, own);
    expect(mediaClearAiRoute.response.parse(cleared.body).aiGenerated).toBe(false);
    await expectMediaError(run(mediaClearAiRoute, own), 'conflict', 409);
    expect(await auditActions(own)).toEqual(['media.ai_cleared']);
  });

  it('refuses the usage list to a grant that may read media but not posts', async () => {
    const asset = await fx.ingest(a, pngFixture({ width: 13, height: 13 }));
    await expect(run(mediaUsageRoute, asset, agent())).rejects.toMatchObject({
      code: 'forbidden',
      status: 403,
    });
  });

  it('purges only unreferenced assets deleted more than 30 days ago', async () => {
    const old = await fx.ingest(a, pngFixture({ width: 10, height: 10 }));
    const recent = await fx.ingest(a, pngFixture({ width: 11, height: 11 }));
    const used = await fx.ingest(a, pngFixture({ width: 12, height: 12 }));
    await postUsing(used);
    const thumb = randomBytes(32);
    const thumbKey = storageKey(a.workspaceId, thumb);
    await fx.store.put(thumbKey, new Uint8Array([1, 2, 3]));
    await tenant((trx) =>
      trx
        .insertInto('media_renditions')
        .values({
          workspace_id: a.workspaceId,
          media_asset_id: uuidOf(old),
          purpose: 'thumb_768',
          transform_hash: randomBytes(32),
          storage_key: thumbKey,
          sha256: thumb,
          mime: 'image/webp',
          bytes: '3',
        })
        .execute(),
    );
    const oldKey = await keyOf(old);
    await setColumn(old, 'deleted_at', sql`now() - interval '31 days'`);
    await setColumn(used, 'deleted_at', sql`now() - interval '31 days'`);
    await setColumn(recent, 'deleted_at', sql`now() - interval '29 days'`);

    const staging = createStaging(join(fx.root, '.staging'));
    const summary = JSON.parse(
      await collectMedia(fx.db, { staging, store: fx.store, logger: pino({ level: 'silent' }) }),
    );
    expect(summary).toEqual({ expired: 0, purged: 1, skipped: 1, orphaned: 0, incoming: 0 });

    const left = await tenant((trx) =>
      trx
        .selectFrom('media_assets')
        .select('id')
        .where('id', 'in', [uuidOf(old), uuidOf(recent), uuidOf(used)])
        .execute(),
    );
    expect(left.map((row) => row.id).sort()).toEqual([uuidOf(recent), uuidOf(used)].sort());
    expect(await fx.store.has(oldKey)).toBe(false);
    expect(await fx.store.has(thumbKey)).toBe(false);
  });

  it('keeps an object whose key a re-upload references again before the delete', async () => {
    const bytes = pngFixture({ width: 14, height: 14 });
    const first = await fx.ingest(a, bytes);
    const key = await keyOf(first);
    await tenant((trx) => trx.deleteFrom('media_assets').where('id', '=', uuidOf(first)).execute());
    await fx.ingest(a, bytes);
    expect(await removeIfUnreferenced(fx.db, fx.store, a.workspaceId, key)).toBe(false);
    expect(await fx.store.has(key)).toBe(true);
  });

  it('retries the video finish when a written object is gone under the key lock', async () => {
    const id = await tenant(async (trx) => {
      const row = await trx
        .insertInto('media_assets')
        .values({
          workspace_id: a.workspaceId,
          kind: 'video',
          state: 'processing',
          storage_key: randomBytes(32).toString('hex'),
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      return row.id;
    });
    const hash = randomBytes(32);
    const video = {
      key: storageKey(a.workspaceId, hash),
      sha256: hash,
      sourceSha256: hash,
      bytes: 10,
      width: 16,
      height: 9,
      durationMs: 4000,
      frameRateMilli: null,
      poster: { key: storageKey(a.workspaceId, randomBytes(32)), sha256: hash, bytes: 3 },
    };
    const job = { workspaceId: a.workspaceId, id };
    await expect(finishMedia(fx.db, fx.store, job, video)).rejects.toBeInstanceOf(
      StoredObjectMissing,
    );
  });
});
