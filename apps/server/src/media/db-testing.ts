import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodePublicId } from '@kronaut/core';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import {
  createLocalStore,
  type MediaStore,
  type ReencodeFormat,
  reencodeImage,
} from '@kronaut/media';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import type { MediaAssetDto } from './dto.ts';
import { ingestImage, prepareImage } from './ingest.ts';

export interface Tenant {
  readonly userId: string;
  readonly workspaceId: string;
}

export interface MediaDb {
  readonly db: Database;
  readonly store: MediaStore;
  readonly root: string;
  readonly a: Tenant;
  readonly b: Tenant;
  ingest(
    tenant: Tenant,
    data: Uint8Array,
    filename?: string,
    aiGenerated?: boolean,
  ): Promise<MediaAssetDto>;
  stop(): Promise<void>;
}

const SYSTEM: Actor = { kind: 'system' };
export const NOW = Temporal.Instant.from('2026-10-21T12:00:00Z');
export const clock = () => NOW;

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
  const userId = await db.withActor(SYSTEM, async (trx) => {
    const result = await sql<{ id: string }>`
      select auth_create_user(${`${label}@example.test`}, ${`${label}@example.test`},
                              ${`User ${label}`}, 'hash', 'en') as id
    `.execute(trx);
    return result.rows[0]?.id ?? '';
  });
  const workspaceId = await db.withActor({ kind: 'user', id: userId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id
        from provision_organization(${`Org ${label}`}, ${`Workspace ${label}`}, ${`ws-${label}`}, 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  return { userId, workspaceId };
}

export async function startMediaDb(
  urls: { readonly appUrl: string },
  label: string,
): Promise<MediaDb> {
  const db = createDatabase({ connectionString: urls.appUrl });
  const root = await mkdtemp(join(tmpdir(), `kronaut-${label}-`));
  const store = createLocalStore(root);
  const a = await provision(db, `${label}-a`);
  const b = await provision(db, `${label}-b`);
  return {
    db,
    store,
    root,
    a,
    b,
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
      await rm(root, { recursive: true, force: true });
    },
  };
}
