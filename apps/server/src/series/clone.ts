import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import type { Temporal } from 'temporal-polyfill';
import { insertDraft } from '../posts/create.ts';
import type { ProviderRegistry } from '../providers.ts';
import type { OwnerActing } from './owner.ts';
import type { SeriesRow } from './store.ts';

export interface CloneInput {
  readonly workspaceId: string;
  readonly series: SeriesRow;
  readonly sourceId: string;
  readonly local: Temporal.PlainDateTime;
}

type Doc = Record<string, unknown>;

async function loadSource(trx: TenantDb, workspaceId: string, postId: string) {
  const post = await trx
    .selectFrom('posts')
    .select(['title', 'brand_id', 'location_id', 'campaign_id', 'agent_dirty'])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', postId)
    .executeTakeFirstOrThrow();
  const variants = await trx
    .selectFrom('post_variants')
    .select(['id', 'is_default'])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .orderBy('created_at')
    .orderBy('id')
    .execute();
  const items = await trx
    .selectFrom('variant_items')
    .select(['id', 'variant_id', 'role', 'doc'])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .orderBy('position')
    .execute();
  const media =
    items.length === 0
      ? []
      : await trx
          .selectFrom('item_media')
          .select(['item_id', 'media_asset_id', 'alt_text'])
          .where('workspace_id', '=', workspaceId)
          .where(
            'item_id',
            'in',
            items.map((item) => item.id),
          )
          .orderBy('position')
          .execute();
  const destinations = await trx
    .selectFrom('post_destinations')
    .select(['social_account_id', 'publish_type', 'delivery_mode', 'settings', 'variant_id'])
    .select('agent_content')
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .orderBy('created_at')
    .orderBy('id')
    .execute();
  return { post, variants, items, media, destinations };
}

type Source = Awaited<ReturnType<typeof loadSource>>;

function itemsOf(source: Source, variantId: string) {
  return source.items
    .filter((item) => item.variant_id === variantId)
    .map((item) => ({
      role: item.role as 'main' | 'thread' | 'comment',
      doc: item.doc as Doc,
      media: source.media
        .filter((m) => m.item_id === item.id)
        .map((m) => ({
          mediaId: encodePublicId('media', m.media_asset_id),
          altText: m.alt_text,
        })),
    }));
}

function bodyOf(source: Source) {
  const fallback = source.variants.find((v) => v.is_default)?.id ?? null;
  const custom = source.variants.filter(
    (v) => !v.is_default && source.destinations.some((d) => d.variant_id === v.id),
  );
  return {
    ...(source.post.title === null ? {} : { title: source.post.title }),
    items: fallback === null ? [] : itemsOf(source, fallback),
    variants: custom.map((v) => ({ items: itemsOf(source, v.id) })),
    destinations: source.destinations.map((d) => {
      const index = custom.findIndex((v) => v.id === d.variant_id);
      return {
        accountId: encodePublicId('socialAccount', d.social_account_id),
        publishType: d.publish_type,
        deliveryMode: d.delivery_mode as 'auto' | 'reminder',
        settings: d.settings as Doc,
        variant: index < 0 ? null : index,
      };
    }),
  };
}

// Agent-written content stays agent-written in the copy, so it still needs an approval.
function tainted(source: Source): boolean {
  return source.post.agent_dirty || source.destinations.some((d) => d.agent_content);
}

export async function cloneOccurrence(
  trx: TenantDb,
  deps: { readonly providers: ProviderRegistry; readonly acting: OwnerActing },
  { workspaceId, series, sourceId, local }: CloneInput,
): Promise<string> {
  const source = await loadSource(trx, workspaceId, sourceId);
  const { post } = source;
  return await insertDraft(trx, deps.providers, {
    workspaceId,
    body: bodyOf(source),
    columns: {
      origin: 'recurrence',
      created_by_user_id: series.owner_user_id,
      created_by_grant_id: series.owner_grant_id,
      brand_id: post.brand_id,
      location_id: post.location_id,
      campaign_id: post.campaign_id,
      schedule_mode: 'instant',
      schedule_local: local.toString(),
      schedule_tz: series.timezone,
      series_id: series.id,
      agent_dirty: tainted(source),
    },
    authorize: (units) => deps.acting.authorize('posts:draft', { workspaceId, units }),
  });
}
