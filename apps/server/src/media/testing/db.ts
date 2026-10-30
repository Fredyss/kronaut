import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodePublicId, encodePublicId, type Role } from '@kronaut/core';
import { type Actor, createDatabase, type Database, type TenantDb } from '@kronaut/db';
import {
  createLocalStore,
  type MediaStore,
  type ReencodeFormat,
  reencodeImage,
} from '@kronaut/media';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import pino from 'pino';
import { Temporal } from 'temporal-polyfill';
import {
  type Auth,
  BASE,
  createTestInstance,
  createTestUser,
  insertTestGrant,
  loginAs,
  randomGrantToken,
  requestAs,
  type TestRequest,
} from '../../http/testing.ts';
import type { BoundRoute } from '../../http/types.ts';
import { createMediaSigner } from '../access.ts';
import type { MediaAssetDto } from '../dto.ts';
import type { MediaGcDeps } from '../gc.ts';
import { ingestImage, prepareImage } from '../ingest.ts';
import { createStaging, type Staging } from '../staging.ts';

export interface Tenant {
  readonly userId: string;
  readonly workspaceId: string;
}

export interface MediaGrant {
  readonly id: string;
  readonly auth: Auth;
}

export interface MediaCall {
  readonly body?: unknown;
  readonly key?: string;
  readonly auth?: Auth;
}

export interface MediaDbOptions {
  readonly staging?: (root: string) => Staging;
}

export interface MediaDb {
  readonly db: Database;
  readonly store: MediaStore;
  readonly staging: Staging;
  readonly root: string;
  readonly app: Hono;
  readonly routes: readonly BoundRoute[];
  readonly a: Tenant;
  readonly b: Tenant;
  auth(tenant: Tenant): Auth;
  call(
    tenant: Tenant,
    method: TestRequest['method'],
    path: string,
    options?: MediaCall,
  ): Promise<Response>;
  member(tenant: Tenant, label: string, role: Role): Promise<Auth>;
  grant(tenant: Tenant, scopes: readonly string[], restricted?: boolean): Promise<MediaGrant>;
  ingest(
    tenant: Tenant,
    data: Uint8Array,
    filename?: string,
    aiGenerated?: boolean,
  ): Promise<MediaAssetDto>;
  stop(): Promise<void>;
}

const CLI: Actor = { kind: 'cli' };
export const NOW = Temporal.Instant.from('2026-10-21T12:00:00Z');
export const clock = () => NOW;
export const MEDIA_BASE = 'https://media.example.test';
export const signer = createMediaSigner({
  signingKey: new Uint8Array(32).fill(7),
  mediaBaseUrl: new URL(MEDIA_BASE),
  clock,
});

export function idleMediaGc(): MediaGcDeps {
  return {
    staging: createStaging('/nonexistent'),
    store: createLocalStore('/nonexistent'),
    logger: pino({ level: 'silent' }),
  };
}

export function stagingUnder(root: string): Staging {
  return createStaging(join(root, '.staging'));
}

export function asUser(tenant: Tenant): Actor {
  return { kind: 'user', id: tenant.userId };
}

export function uuidOf(asset: { id: string }): string {
  const id = decodePublicId('media', asset.id);
  if (id === null) throw new Error(`not a media id: ${asset.id}`);
  return id;
}

export async function masterOf(data: Uint8Array, format: ReencodeFormat): Promise<Uint8Array> {
  return (await reencodeImage(data, format)).bytes;
}

async function provision(db: Database, label: string): Promise<Tenant> {
  const userId = await createTestUser(db, label);
  const workspaceId = await db.withActor({ kind: 'user', id: userId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id
        from provision_organization(${`Org ${label}`}, ${`Workspace ${label}`}, ${`ws-${label}`}, 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  return { userId, workspaceId };
}

async function scopeToBrand(trx: TenantDb, workspaceId: string, grantId: string): Promise<void> {
  const slug = `brand-${randomBytes(4).toString('hex')}`;
  const { id } = await trx
    .insertInto('brands')
    .values({ workspace_id: workspaceId, name: slug, slug })
    .returning('id')
    .executeTakeFirstOrThrow();
  await trx
    .insertInto('access_scopes')
    .values({ workspace_id: workspaceId, grant_id: grantId, brand_id: id })
    .execute();
}

export async function startMediaDb(
  urls: { readonly appUrl: string; readonly ownerUrl: string },
  label: string,
  options: MediaDbOptions = {},
): Promise<MediaDb> {
  const db = createDatabase({ connectionString: urls.appUrl });
  const owner = createDatabase({ connectionString: urls.ownerUrl });
  const root = await mkdtemp(join(tmpdir(), `kronaut-${label}-`));
  const store = createLocalStore(root);
  const staging = options.staging?.(root) ?? createStaging('/nonexistent');
  // No fixed clock here: auth_lookup_session checks expiry against the database's now(), so a
  // session started at NOW is dead once NOW is a week old.
  const { app, deps, routes } = createTestInstance({ db, store, signer, staging });
  const a = await provision(db, `${label}-a`);
  const b = await provision(db, `${label}-b`);
  const sessions = new Map<string, Auth>([
    [a.userId, await loginAs(app, `${label}-a`)],
    [b.userId, await loginAs(app, `${label}-b`)],
  ]);
  const auth = (tenant: Tenant): Auth => {
    const session = sessions.get(tenant.userId);
    if (session === undefined) throw new Error(`no session for ${tenant.userId}`);
    return session;
  };
  return {
    db,
    store,
    staging,
    root,
    app,
    routes,
    a,
    b,
    auth,
    call(tenant, method, path, { body, key, auth: caller = auth(tenant) } = {}) {
      const ws = encodePublicId('workspace', tenant.workspaceId);
      const url = `${BASE}/v1/workspaces/${ws}/${path}`;
      return requestAs(app, caller, { method, url, body, key });
    },
    async member(tenant, memberLabel, role) {
      const userId = await createTestUser(db, memberLabel);
      await owner.withActor(CLI, (trx) =>
        trx
          .insertInto('memberships')
          .values({ workspace_id: tenant.workspaceId, user_id: userId, role })
          .execute(),
      );
      return await loginAs(app, memberLabel);
    },
    async grant(tenant, scopes, restricted = false) {
      const { workspaceId, userId: sponsorUserId } = tenant;
      const token = randomGrantToken();
      const spec = { workspaceId, sponsorUserId, scopes, restricted };
      const id = await owner.withActor(CLI, async (trx) => {
        const grantId = await insertTestGrant(trx, deps.keys.grant, token, spec);
        if (restricted) await scopeToBrand(trx, workspaceId, grantId);
        return grantId;
      });
      return { id, auth: { bearer: token } };
    },
    async ingest(tenant, data, filename, aiGenerated = false) {
      const prepared = await prepareImage({
        bytes: data,
        ...(filename === undefined ? {} : { filename }),
      });
      const target = { workspaceId: tenant.workspaceId, aiGenerated };
      return db.withTenant(tenant.workspaceId, asUser(tenant), (trx) =>
        ingestImage(trx, store, target, prepared),
      );
    },
    async stop() {
      await db.destroy();
      await owner.destroy();
      await rm(root, { recursive: true, force: true });
    },
  };
}
