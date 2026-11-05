import { randomUUID } from 'node:crypto';
import { defineRoute } from '@kronaut/contract';
import { decodePublicId, encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { HttpError } from '../../base/http/errors.ts';
import { bindRoute } from '../../base/http/request.ts';
import type { ChannelRef } from './channel-ref.ts';
import { recomputePostBrand } from './post-brand.ts';

const SETTLED = ['completed_all', 'completed_partial', 'completed_failed', 'canceled'] as const;

const channelBrandRoute = defineRoute({
  id: 'channels.set_brand',
  method: 'PUT',
  path: '/v1/workspaces/:workspaceId/channels/:channelId/brand',
  auth: 'session',
  action: 'channels:assign',
  params: z.object({ workspaceId: z.string(), channelId: z.string() }),
  body: z.strictObject({ brandId: z.string().nullable() }),
  response: z.object({ brandId: z.string().nullable() }),
  idempotency: true,
  summary: "Set a channel's brand",
  description:
    "Moves the channel to a brand, or out of every brand with null. This changes which approval policy applies to the channel's posts and who can see them. Unfinished posts on the channel take the new brand at once. An unknown channel or brand is 404, an archived brand 409 brand_archived. Owners and admins only.",
  tags: ['channels'],
});

interface BrandChange {
  readonly ref: ChannelRef;
  readonly brandId: string | null;
  readonly userId: string;
  readonly requestId: string;
}

function brandIdOf(value: string | null): string | null {
  if (value === null) return null;
  const id = decodePublicId('brand', value);
  if (id === null) throw new HttpError('not_found', 'Brand not found.');
  return id;
}

// The share lock makes a concurrent archive wait, so it sees this channel.
async function requireActiveBrand(trx: TenantDb, workspaceId: string, brandId: string) {
  const brand = await trx
    .selectFrom('brands')
    .select('archived_at')
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', brandId)
    .forShare()
    .executeTakeFirst();
  if (brand === undefined) throw new HttpError('not_found', 'Brand not found.');
  if (brand.archived_at !== null) {
    throw new HttpError('brand_archived', 'An archived brand cannot be assigned.');
  }
}

async function lockChannel(trx: TenantDb, { workspaceId, accountId }: ChannelRef) {
  const account = await trx
    .selectFrom('social_accounts')
    .select(['brand_id', 'location_id'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', accountId)
    .forNoKeyUpdate()
    .executeTakeFirst();
  if (account === undefined) throw new HttpError('not_found', 'Not found.');
  return account;
}

async function unfinishedPosts(trx: TenantDb, { workspaceId, accountId }: ChannelRef) {
  const rows = await trx
    .selectFrom('posts as p')
    .select('p.id')
    .where('p.workspace_id', '=', workspaceId)
    .where('p.deleted_at', 'is', null)
    .where('p.publish_summary', 'not in', SETTLED)
    .where((eb) =>
      eb.exists(
        eb
          .selectFrom('post_destinations as d')
          .select('d.id')
          .whereRef('d.workspace_id', '=', 'p.workspace_id')
          .whereRef('d.post_id', '=', 'p.id')
          .where('d.social_account_id', '=', accountId),
      ),
    )
    .orderBy('p.id')
    .forNoKeyUpdate()
    .execute();
  return rows.map((row) => row.id);
}

function publicBrand(brandId: string | null): string | null {
  return brandId === null ? null : encodePublicId('brand', brandId);
}

async function setBrand(trx: TenantDb, change: BrandChange): Promise<void> {
  const { workspaceId, accountId } = change.ref;
  const current = await lockChannel(trx, change.ref);
  if (change.brandId !== null) await requireActiveBrand(trx, workspaceId, change.brandId);
  if (current.brand_id === change.brandId) return;
  await trx
    .updateTable('social_accounts')
    .set({ brand_id: change.brandId, location_id: null })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', accountId)
    .execute();
  await recomputePostBrand(trx, workspaceId, await unfinishedPosts(trx, change.ref));
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: workspaceId,
      actor_kind: 'user',
      actor_id: change.userId,
      surface: 'ui',
      action: 'channel.brand_updated',
      resource_kind: 'social_account',
      resource_id: accountId,
      brand_id: change.brandId,
      social_account_ids: [accountId],
      outcome: 'ok',
      args_summary: JSON.stringify({
        from: publicBrand(current.brand_id),
        to: publicBrand(change.brandId),
      }),
      correlation_id: randomUUID(),
      request_id: change.requestId,
    })
    .execute();
}

export function bindBrand() {
  return bindRoute(channelBrandRoute, async ({ params, body }, ctx) => {
    const workspaceId = decodePublicId('workspace', params.workspaceId);
    if (workspaceId === null) throw new HttpError('not_found', 'Not found.');
    ctx.authorize('channels:assign', { workspaceId });
    if (ctx.session === null) throw new HttpError('internal', 'The route needs a session.');
    const accountId = decodePublicId('socialAccount', params.channelId);
    if (accountId === null) throw new HttpError('not_found', 'Not found.');
    const change = {
      ref: { workspaceId, accountId },
      brandId: brandIdOf(body.brandId),
      userId: ctx.session.userId,
      requestId: ctx.requestId,
    };
    await ctx.tenant((trx) => setBrand(trx, change));
    return { body: { brandId: body.brandId } };
  });
}
