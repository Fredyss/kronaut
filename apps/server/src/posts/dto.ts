import { DESTINATION_STATES, encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';

const JsonObject = z.record(z.string(), z.unknown());
const Instant = z.iso.datetime();

export const PostMediaSchema = z.object({
  mediaId: z.string(),
  position: z.number().int().nonnegative(),
  altText: z.string().nullable(),
});

export const PostItemSchema = z.object({
  position: z.number().int().nonnegative(),
  role: z.enum(['main', 'thread', 'comment']),
  doc: JsonObject,
  media: z.array(PostMediaSchema),
});

export const PostDestinationSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  provider: z.string(),
  publishType: z.string(),
  deliveryMode: z.enum(['auto', 'reminder']),
  settings: JsonObject,
  state: z.enum(DESTINATION_STATES),
  stateReason: z.string().nullable(),
  version: z.number().int().positive(),
  scheduledAt: Instant.nullable(),
  remoteUrl: z.string().nullable(),
  publishedAt: Instant.nullable(),
  lastErrorCode: z.string().nullable(),
  variant: z.number().int().nonnegative().nullable(),
});

export const PostVariantSchema = z.object({ items: z.array(PostItemSchema) });

export const PostSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  title: z.string().nullable(),
  scheduleMode: z.enum(['unscheduled', 'asap', 'instant', 'local_per_destination']),
  scheduleLocal: z.iso.datetime({ local: true }).nullable(),
  scheduleTz: z.string().nullable(),
  publishSummary: z.enum([
    'draft',
    'in_review',
    'scheduled',
    'in_progress',
    'needs_action',
    'completed_all',
    'completed_partial',
    'completed_failed',
    'canceled',
  ]),
  items: z.array(PostItemSchema),
  variants: z.array(PostVariantSchema),
  destinations: z.array(PostDestinationSchema),
  createdAt: Instant,
  updatedAt: Instant,
});

export type PostDto = z.output<typeof PostSchema>;

export const PostSummarySchema = PostSchema.pick({
  id: true,
  version: true,
  title: true,
  publishSummary: true,
  scheduleMode: true,
  scheduleLocal: true,
  scheduleTz: true,
  updatedAt: true,
}).extend({
  excerpt: z.string(),
  mediaCount: z.number().int().nonnegative(),
  destinations: z.array(
    PostDestinationSchema.pick({
      id: true,
      accountId: true,
      provider: true,
      publishType: true,
      state: true,
      scheduledAt: true,
      publishedAt: true,
      remoteUrl: true,
      lastErrorCode: true,
    }),
  ),
});

export type PostSummaryDto = z.output<typeof PostSummarySchema>;

export function iso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export function plainLocal(value: string | null): string | null {
  return value === null ? null : Temporal.PlainDateTime.from(value.replace(' ', 'T')).toString();
}

async function loadPost(trx: TenantDb, workspaceId: string, postId: string) {
  return await trx
    .selectFrom('posts')
    .select([
      'id',
      'version',
      'title',
      'schedule_mode',
      'schedule_local',
      'schedule_tz',
      'publish_summary',
      'created_at',
      'updated_at',
    ])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', postId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst();
}

async function loadItems(trx: TenantDb, workspaceId: string, postId: string) {
  const items = await trx
    .selectFrom('variant_items as i')
    .innerJoin('post_variants as v', (join) =>
      join.onRef('v.workspace_id', '=', 'i.workspace_id').onRef('v.id', '=', 'i.variant_id'),
    )
    .select(['i.id', 'i.variant_id', 'v.is_default', 'i.position', 'i.role', 'i.doc'])
    .where('i.workspace_id', '=', workspaceId)
    .where('i.post_id', '=', postId)
    .orderBy('i.position')
    .execute();
  const media =
    items.length === 0
      ? []
      : await trx
          .selectFrom('item_media')
          .select(['item_id', 'media_asset_id', 'position', 'alt_text'])
          .where('workspace_id', '=', workspaceId)
          .where(
            'item_id',
            'in',
            items.map((item) => item.id),
          )
          .orderBy('position')
          .execute();
  return items.map((item) => ({
    variantId: item.variant_id,
    isDefault: item.is_default,
    position: item.position,
    role: item.role,
    doc: item.doc,
    media: media
      .filter((m) => m.item_id === item.id)
      .map((m) => ({
        mediaId: encodePublicId('media', m.media_asset_id),
        position: m.position,
        altText: m.alt_text,
      })),
  }));
}

async function loadDestinations(trx: TenantDb, workspaceId: string, postId: string) {
  const destinations = await trx
    .selectFrom('post_destinations as d')
    .innerJoin('social_accounts as a', (join) =>
      join.onRef('a.workspace_id', '=', 'd.workspace_id').onRef('a.id', '=', 'd.social_account_id'),
    )
    .leftJoin('post_variants as v', (join) =>
      join.onRef('v.workspace_id', '=', 'd.workspace_id').onRef('v.id', '=', 'd.variant_id'),
    )
    .select([
      'd.id',
      'd.variant_id',
      'v.is_default',
      'd.social_account_id',
      'd.provider',
      'd.publish_type',
      'd.delivery_mode',
      'd.settings',
      'd.state',
      'd.state_reason',
      'd.version',
      'd.scheduled_at',
      'd.remote_url',
      'd.published_at',
      'd.last_error_code',
    ])
    .where('d.workspace_id', '=', workspaceId)
    .where('d.post_id', '=', postId)
    .orderBy('a.created_at')
    .orderBy('a.id')
    .orderBy('d.publish_type')
    .execute();
  return destinations.map((d) => ({
    variantId: d.is_default === false ? d.variant_id : null,
    id: encodePublicId('destination', d.id),
    accountId: encodePublicId('socialAccount', d.social_account_id),
    provider: d.provider,
    publishType: d.publish_type,
    deliveryMode: d.delivery_mode,
    settings: d.settings,
    state: d.state,
    stateReason: d.state_reason,
    version: d.version,
    scheduledAt: iso(d.scheduled_at),
    remoteUrl: d.remote_url,
    publishedAt: iso(d.published_at),
    lastErrorCode: d.last_error_code,
  }));
}

type LoadedItem = Awaited<ReturnType<typeof loadItems>>[number];
type LoadedDestination = Awaited<ReturnType<typeof loadDestinations>>[number];

function itemOf({ position, role, doc, media }: LoadedItem) {
  return { position, role, doc, media };
}

function indexVariants(items: readonly LoadedItem[], loaded: readonly LoadedDestination[]) {
  const order: string[] = [];
  const destinations = loaded.map(({ variantId, ...d }) => {
    if (variantId === null) return { ...d, variant: null };
    if (!order.includes(variantId)) order.push(variantId);
    return { ...d, variant: order.indexOf(variantId) };
  });
  const variants = order.map((id) => ({
    items: items.filter((item) => item.variantId === id).map(itemOf),
  }));
  return { variants, destinations };
}

export async function findPost(
  trx: TenantDb,
  workspaceId: string,
  postId: string,
): Promise<PostDto | null> {
  const post = await loadPost(trx, workspaceId, postId);
  if (post === undefined) return null;

  const loaded = await loadItems(trx, workspaceId, postId);
  const { variants, destinations } = indexVariants(
    loaded,
    await loadDestinations(trx, workspaceId, postId),
  );
  const items = loaded.filter((item) => item.isDefault).map(itemOf);

  return PostSchema.parse({
    id: encodePublicId('post', post.id),
    version: post.version,
    title: post.title,
    scheduleMode: post.schedule_mode,
    scheduleLocal: plainLocal(post.schedule_local),
    scheduleTz: post.schedule_tz,
    publishSummary: post.publish_summary,
    items,
    variants,
    destinations,
    createdAt: iso(post.created_at),
    updatedAt: iso(post.updated_at),
  });
}

export async function readPost(
  trx: TenantDb,
  workspaceId: string,
  postId: string,
): Promise<PostDto> {
  const post = await findPost(trx, workspaceId, postId);
  if (post === null) throw new Error(`post ${postId} vanished inside its own transaction`);
  return post;
}
