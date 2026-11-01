import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { storageKey } from '@kronaut/media';
import { sql } from 'kysely';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { expectError } from '../http/testing.ts';
import type { ResolvedItem } from '../posts/items.ts';
import { insertVariant } from '../posts/variants.ts';
import { collectMedia } from './gc.ts';
import { ingestImage, prepareImage } from './ingest.ts';
import { removeIfUnreferenced } from './key-lock.ts';
import { mediaClearAiRoute, mediaListRoute, mediaUsageRoute } from './library-routes.ts';
import { finishMedia, StoredObjectMissing } from './process-finish.ts';
import { createStaging } from './staging.ts';
import {
  asUser,
  MEDIA_BASE,
  type MediaDb,
  type MediaGrant,
  startMediaDb,
  type Tenant,
  uuidOf,
} from './testing/db.ts';
import { jpegFixture, pngFixture } from './testing.ts';

let test: TestDatabase;
let fx: MediaDb;
let a: Tenant;
let agent: MediaGrant;

beforeAll(async () => {
  test = await startTestDatabase();
  fx = await startMediaDb(test, 'library');
  ({ a } = fx);
  agent = await fx.grant(a, ['media:read', 'media:write']);
});

afterAll(async () => {
  await fx?.stop();
  await test?.stop();
});

function list(query: string) {
  return fx.call(a, 'GET', `media?${query}`);
}

function usage(asset: { id: string }, auth = fx.auth(a)) {
  return fx.call(a, 'GET', `media/${asset.id}/usage`, { auth });
}

function clearAi(asset: { id: string }) {
  return fx.call(a, 'DELETE', `media/${asset.id}/ai-generated`);
}

function remove(asset: { id: string }) {
  return fx.call(a, 'DELETE', `media/${asset.id}`);
}

async function ingestAsAgent(data: Uint8Array) {
  const prepared = await prepareImage({ bytes: data });
  const target = { workspaceId: a.workspaceId, aiGenerated: true };
  return await fx.db.withTenant(a.workspaceId, { kind: 'grant', id: agent.id }, (trx) =>
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
    const listed = await list('kind=image');
    expect(listed.status).toBe(200);
    const page = mediaListRoute.response.parse(await listed.json()).items;
    expect(page.map((item) => item.id)).not.toContain(rejected.id);
    expect(page.find((item) => item.id === used.id)?.previewUrl).toMatch(
      new RegExp(`^${MEDIA_BASE}/m/[0-9a-f]{64}\\?exp=`),
    );
    const counts = new Map(page.map((item) => [item.id, item.usageCount]));
    expect(counts.get(used.id)).toBe(1);
    expect(counts.get(unused.id)).toBe(0);
    const usedBy = await usage(used);
    expect(usedBy.status).toBe(200);
    expect(mediaUsageRoute.response.parse(await usedBy.json()).items).toEqual([
      {
        postId: encodePublicId('post', postId),
        title: 'Launch',
        excerpt: '',
        publishSummary: 'draft',
        scheduledAt: null,
      },
    ]);

    await expectError(await remove(used), 409, 'media_in_use');
    expect(await auditActions(used)).toEqual([]);

    expect((await remove(unused)).status).toBe(204);
    const after = await list('');
    const ids = mediaListRoute.response.parse(await after.json()).items.map((item) => item.id);
    expect(ids).not.toContain(unused.id);
    expect(ids).toContain(used.id);
    expect(await auditActions(unused)).toEqual(['media.deleted']);
  });

  it('clears the AI label of a member upload but never one a grant uploaded or marked', async () => {
    const own = await fx.ingest(a, jpegFixture({ width: 8, height: 8 }), undefined, true);
    const uploaded = await ingestAsAgent(jpegFixture({ width: 9, height: 9 }));
    const marked = await fx.ingest(a, jpegFixture({ width: 10, height: 10 }));
    const marking = await fx.call(a, 'POST', `media/${marked.id}/ai-generated`, {
      auth: agent.auth,
    });
    expect(marking.status).toBe(200);
    const duplicateBytes = jpegFixture({ width: 11, height: 11 });
    const duplicated = await fx.ingest(a, duplicateBytes);
    expect((await ingestAsAgent(duplicateBytes)).id).toBe(duplicated.id);

    for (const locked of [uploaded, marked, duplicated]) {
      await expectError(await clearAi(locked), 409, 'conflict');
    }
    const cleared = await clearAi(own);
    expect(cleared.status).toBe(200);
    expect(mediaClearAiRoute.response.parse(await cleared.json()).aiGenerated).toBe(false);
    await expectError(await clearAi(own), 409, 'conflict');
    expect(await auditActions(own)).toEqual(['media.ai_cleared']);
  });

  it('refuses the usage list to a grant that may read media but not posts', async () => {
    const asset = await fx.ingest(a, pngFixture({ width: 13, height: 13 }));
    await expectError(await usage(asset, agent.auth), 403, 'forbidden');
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
    expect(summary).toEqual({
      expired: 0,
      purged: 1,
      skipped: 1,
      orphaned: 0,
      incoming: 0,
      importsStalled: 0,
      importsDeleted: 0,
    });

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
