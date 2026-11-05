import { randomUUID } from 'node:crypto';
import type { AccessScope } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { auditActor } from '../../access/audit/write.ts';
import { HttpError } from '../../base/http/errors.ts';
import type { RequestContext } from '../../base/http/request.ts';
import { freeSlug, slugBase } from './slug.ts';

export const NAME_MAX = 120;

const NAME_UNIQUE = 'ux_brands_name';
const SLUG_ATTEMPTS = 5;
const SLUG_PREFIX = 59;

export interface BrandRef {
  readonly workspaceId: string;
  readonly brandId: string;
}

export interface BrandChange {
  readonly name?: string | undefined;
  readonly archived?: boolean | undefined;
}

function brandName(value: string): string {
  const name = value.normalize('NFC').trim();
  const length = [...name].length;
  if (length === 0 || length > NAME_MAX) {
    throw new HttpError('unprocessable', `A brand name has 1–${NAME_MAX} characters.`, {
      details: [{ path: 'body.name', code: 'name_invalid' }],
    });
  }
  return name;
}

function isDuplicateName(err: unknown): boolean {
  const { code, constraint } = err as { code?: unknown; constraint?: unknown };
  return code === '23505' && constraint === NAME_UNIQUE;
}

async function uniquely<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (!isDuplicateName(err)) throw err;
    throw new HttpError('brand_name_taken', 'A brand with this name already exists.');
  }
}

function anyOf(ids: readonly string[]) {
  return sql`${[...ids]}::uuid[]`;
}

function channelIn(scope: AccessScope | null) {
  if (scope === null) return sql<boolean>`true`;
  return sql<boolean>`(a.id = ANY(${anyOf(scope.socialAccountIds)})
    OR a.brand_id = ANY(${anyOf(scope.brandIds)}) OR a.location_id = ANY(${anyOf(scope.locationIds)}))`;
}

function brandRows(trx: TenantDb, workspaceId: string, scope: AccessScope | null) {
  const counted = channelIn(scope);
  return trx
    .selectFrom('brands as b')
    .select(['b.id', 'b.name', 'b.slug', 'b.archived_at'])
    .select(
      sql<string>`(
        SELECT count(*) FROM social_accounts a
        WHERE a.workspace_id = b.workspace_id AND a.brand_id = b.id
          AND a.status <> 'disconnected' AND ${counted})`.as('channel_count'),
    )
    .where('b.workspace_id', '=', workspaceId);
}

export type BrandRow = Awaited<ReturnType<ReturnType<typeof brandRows>['execute']>>[number];

export async function listBrands(trx: TenantDb, workspaceId: string, scope: AccessScope | null) {
  let query = brandRows(trx, workspaceId, scope);
  if (scope !== null) {
    query = query.where(
      sql<boolean>`(b.id = ANY(${anyOf(scope.brandIds)}) OR EXISTS (
        SELECT 1 FROM social_accounts a
        WHERE a.workspace_id = b.workspace_id AND a.brand_id = b.id AND ${channelIn(scope)}))`,
    );
  }
  return await query.orderBy(sql`lower(b.name)`).orderBy('b.id').execute();
}

async function readBrand(trx: TenantDb, { workspaceId, brandId }: BrandRef) {
  const row = await brandRows(trx, workspaceId, null)
    .where('b.id', '=', brandId)
    .executeTakeFirst();
  if (row === undefined) throw new HttpError('not_found', 'Brand not found.');
  return row;
}

interface BrandAudit {
  readonly ref: BrandRef;
  readonly action: string;
  readonly args: Readonly<Record<string, unknown>>;
}

async function audit(trx: TenantDb, ctx: RequestContext, { ref, action, args }: BrandAudit) {
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: ref.workspaceId,
      ...(await auditActor(trx, ref.workspaceId, ctx.principal)),
      action,
      resource_kind: 'brand',
      resource_id: ref.brandId,
      brand_id: ref.brandId,
      outcome: 'ok',
      args_summary: JSON.stringify(args),
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
}

async function takenSlugs(trx: TenantDb, workspaceId: string, base: string) {
  const rows = await trx
    .selectFrom('brands')
    .select('slug')
    .where('workspace_id', '=', workspaceId)
    .where('slug', 'like', `${base.slice(0, SLUG_PREFIX)}%`)
    .execute();
  return new Set(rows.map((row) => row.slug));
}

async function insertBrand(trx: TenantDb, workspaceId: string, name: string): Promise<string> {
  const base = slugBase(name);
  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt += 1) {
    const slug = freeSlug(base, await takenSlugs(trx, workspaceId, base));
    const row = await uniquely(() =>
      trx
        .insertInto('brands')
        .values({ workspace_id: workspaceId, name, slug })
        .onConflict((oc) => oc.columns(['workspace_id', 'slug']).doNothing())
        .returning('id')
        .executeTakeFirst(),
    );
    if (row !== undefined) return row.id;
  }
  throw new HttpError('conflict', 'The brand could not get a free slug; try again.');
}

export async function createBrand(
  trx: TenantDb,
  ctx: RequestContext,
  workspaceId: string,
  body: { readonly name: string },
) {
  const name = brandName(body.name);
  const brandId = await insertBrand(trx, workspaceId, name);
  const ref = { workspaceId, brandId };
  const created = await readBrand(trx, ref);
  await audit(trx, ctx, { ref, action: 'brand.created', args: { slug: created.slug } });
  return created;
}

async function refuseInUse(trx: TenantDb, { workspaceId, brandId }: BrandRef): Promise<void> {
  const used = await trx
    .selectFrom('social_accounts')
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('brand_id', '=', brandId)
    .where('status', '<>', 'disconnected')
    .executeTakeFirst();
  if (used !== undefined) {
    throw new HttpError('brand_in_use', 'Move its channels to another brand before archiving.');
  }
}

async function lockBrand(trx: TenantDb, { workspaceId, brandId }: BrandRef) {
  const row = await trx
    .selectFrom('brands')
    .select(['name', 'archived_at'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', brandId)
    .forUpdate()
    .executeTakeFirst();
  if (row === undefined) throw new HttpError('not_found', 'Brand not found.');
  return row;
}

export async function updateBrand(
  trx: TenantDb,
  ctx: RequestContext,
  ref: BrandRef,
  body: BrandChange,
) {
  const current = await lockBrand(trx, ref);
  const name = body.name === undefined ? current.name : brandName(body.name);
  const wasArchived = current.archived_at !== null;
  const archived = body.archived ?? wasArchived;
  if (name === current.name && archived === wasArchived) return await readBrand(trx, ref);
  if (archived && !wasArchived) await refuseInUse(trx, ref);
  await uniquely(() =>
    trx
      .updateTable('brands')
      .set({
        name,
        ...(archived === wasArchived ? {} : { archived_at: archived ? sql`now()` : null }),
      })
      .where('workspace_id', '=', ref.workspaceId)
      .where('id', '=', ref.brandId)
      .execute(),
  );
  const args = { renamed: name !== current.name, archived };
  await audit(trx, ctx, { ref, action: 'brand.updated', args });
  return await readBrand(trx, ref);
}
