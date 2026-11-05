import { defineRoute } from '@kronaut/contract';
import { encodePublicId } from '@kronaut/core';
import * as z from 'zod';
import { pathId } from '../../base/http/params.ts';
import { type BoundRoute, bindRoute } from '../../base/http/request.ts';
import { iso } from '../../base/http/time.ts';
import { type BrandRow, createBrand, listBrands, NAME_MAX, updateBrand } from './store.ts';

const PATH = '/v1/workspaces/:workspaceId/brands';

const WorkspaceParams = z.object({ workspaceId: z.string() });
const BrandParams = z.object({ workspaceId: z.string(), brandId: z.string() });

const BrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  archivedAt: z.iso.datetime().nullable(),
  channelCount: z.number().int().nonnegative(),
});

const brandListRoute = defineRoute({
  id: 'brands.list',
  method: 'GET',
  path: PATH,
  auth: ['session', 'grant'],
  action: 'brands:read',
  params: WorkspaceParams,
  response: z.object({ items: z.array(BrandSchema) }),
  summary: 'List brands',
  description:
    "The workspace's brands by name, archived ones included, with how many connected channels each has. A restricted principal gets only the brands in its scope or with a channel in its scope, and counts only those channels.",
  tags: ['brands'],
});

const brandCreateRoute = defineRoute({
  id: 'brands.create',
  method: 'POST',
  path: PATH,
  auth: 'session',
  action: 'brands:write',
  params: WorkspaceParams,
  body: z.strictObject({ name: z.string() }),
  response: BrandSchema,
  status: 201,
  idempotency: true,
  summary: 'Create a brand',
  description: `The name is trimmed and has 1–${NAME_MAX} characters (422 name_invalid). A name that differs only in case from another brand's, archived ones included, is 409 brand_name_taken. The slug comes from the name and gets -2, -3 … when it is taken. Owners and admins only.`,
  tags: ['brands'],
});

const brandUpdateRoute = defineRoute({
  id: 'brands.update',
  method: 'PATCH',
  path: `${PATH}/:brandId`,
  auth: 'session',
  action: 'brands:write',
  params: BrandParams,
  body: z.strictObject({ name: z.string().optional(), archived: z.boolean().optional() }),
  response: BrandSchema,
  idempotency: true,
  summary: 'Rename or archive a brand',
  description:
    'The name follows the same rules as when creating a brand; the slug stays. Archiving is 409 brand_in_use while a channel that is not disconnected belongs to the brand; archiving takes the brand off its disconnected channels, so they come back without one when reconnected. An archived brand cannot be assigned to a channel. Owners and admins only.',
  tags: ['brands'],
});

function brandDto(row: BrandRow) {
  return BrandSchema.parse({
    id: encodePublicId('brand', row.id),
    name: row.name,
    slug: row.slug,
    archivedAt: iso(row.archived_at),
    channelCount: Number(row.channel_count),
  });
}

export function brandRoutes(): BoundRoute[] {
  return [
    bindRoute(brandListRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const decision = ctx.authorize('brands:read', { workspaceId });
      const scope = decision.kind === 'allow_scoped' ? decision.scope : null;
      const rows = await ctx.tenant((trx) => listBrands(trx, workspaceId, scope));
      return { body: { items: rows.map(brandDto) } };
    }),
    bindRoute(brandCreateRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('brands:write', { workspaceId });
      const row = await ctx.tenant((trx) => createBrand(trx, ctx, workspaceId, body));
      return { status: 201, body: brandDto(row) };
    }),
    bindRoute(brandUpdateRoute, async ({ params, body }, ctx) => {
      const ref = {
        workspaceId: pathId('workspace', params.workspaceId),
        brandId: pathId('brand', params.brandId),
      };
      ctx.authorize('brands:write', { workspaceId: ref.workspaceId });
      const row = await ctx.tenant((trx) => updateBrand(trx, ctx, ref, body));
      return { body: brandDto(row) };
    }),
  ];
}
