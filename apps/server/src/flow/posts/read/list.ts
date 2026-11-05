import type { DocJson } from '@kronaut/compose';
import { defineRoute } from '@kronaut/contract';
import { type AccessScope, decodePublicId, encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import {
  brandFilter,
  excerptOf,
  groupFilter,
  loadMains,
  onBrand,
  onGroup,
  visibleIn,
} from '../../../access/post-access/reads.ts';
import { denyError } from '../../../base/http/errors.ts';
import { hidesGroups } from '../../../base/http/grant-scopes.ts';
import { pathId } from '../../../base/http/params.ts';
import { type BoundRoute, bindRoute } from '../../../base/http/request.ts';
import { iso, plainLocal } from '../../../base/http/time.ts';
import { loadPostTags, type PostTagRow, tagFields } from '../../../steps/tags/read.ts';
import { type PostSummaryDto, PostSummarySchema } from './dto.ts';
import { DRAFTS_DEFAULT_LIMIT, type ListFilter, ListQuery, listFilter } from './list-filter.ts';

export const RANGE_MAX_POSTS = 500;

export const postListRoute = defineRoute({
  id: 'posts.list',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/posts',
  auth: ['session', 'grant'],
  action: 'posts:read',
  params: z.object({ workspaceId: z.string() }),
  query: ListQuery,
  response: z.object({ items: z.array(PostSummarySchema), truncated: z.boolean() }),
  summary: 'List posts',
  description: `Either the posts with a destination scheduled in [from, to) (ISO instants, at most 42 days apart; at most ${RANGE_MAX_POSTS} posts), or with unscheduled=true the posts with no scheduled destination, newest first (limit 1–100, default ${DRAFTS_DEFAULT_LIMIT}). With tag, only the posts that have that tag; an unknown tag gives an empty list. With brand, only the posts with a destination on a channel of that brand, or with none on a channel without a brand; an unknown brand gives an empty list. With group, only the posts with a non-canceled destination on a channel that is in that group now; an unknown group gives an empty list, and a key without groups:read gets 403. Filters combine.`,
  tags: ['posts'],
});

const POST_COLUMNS = [
  'p.id',
  'p.version',
  'p.title',
  'p.schedule_mode',
  'p.schedule_local',
  'p.schedule_tz',
  'p.publish_summary',
  'p.updated_at',
] as const;

interface PostQuery {
  readonly workspaceId: string;
  readonly scope: AccessScope | null;
  readonly tagId: string | undefined;
  readonly brand: { readonly brandId: string | null } | undefined;
  readonly group: { readonly groupId: string } | undefined;
}

async function loadPosts(
  trx: TenantDb,
  { workspaceId, scope, tagId, brand, group }: PostQuery,
  filter: ListFilter,
) {
  let query = trx
    .selectFrom('posts as p')
    .select(POST_COLUMNS)
    .where('p.workspace_id', '=', workspaceId)
    .where('p.deleted_at', 'is', null);
  if (scope !== null) query = query.where(visibleIn(scope));
  if (brand !== undefined) query = query.where(onBrand(brand.brandId));
  if (group !== undefined) query = query.where(onGroup(group.groupId));
  if (tagId !== undefined) {
    query = query.where((eb) =>
      eb.exists(
        eb
          .selectFrom('post_tags as t')
          .select('t.tag_id')
          .whereRef('t.workspace_id', '=', 'p.workspace_id')
          .whereRef('t.post_id', '=', 'p.id')
          .where('t.tag_id', '=', tagId),
      ),
    );
  }
  const max = filter.kind === 'range' ? RANGE_MAX_POSTS : filter.limit;
  const rows =
    filter.kind === 'range'
      ? await query
          .innerJoin('post_destinations as d', (join) =>
            join.onRef('d.workspace_id', '=', 'p.workspace_id').onRef('d.post_id', '=', 'p.id'),
          )
          .select((eb) => eb.fn.min('d.scheduled_at').as('first_at'))
          .where('d.scheduled_at', '>=', filter.from)
          .where('d.scheduled_at', '<', filter.to)
          .groupBy(['p.workspace_id', 'p.id'])
          .orderBy('first_at')
          .orderBy('p.id')
          .limit(max + 1)
          .execute()
      : await query
          .where((eb) =>
            eb.not(
              eb.exists(
                eb
                  .selectFrom('post_destinations as d')
                  .select('d.id')
                  .whereRef('d.workspace_id', '=', 'p.workspace_id')
                  .whereRef('d.post_id', '=', 'p.id')
                  .where('d.scheduled_at', 'is not', null),
              ),
            ),
          )
          .orderBy('p.updated_at', 'desc')
          .orderBy('p.id', 'desc')
          .limit(max + 1)
          .execute();
  return { rows, max };
}

type PostRow = Awaited<ReturnType<typeof loadPosts>>['rows'][number];

type MainRow = Awaited<ReturnType<typeof loadMains>>[number];

async function loadDestinations(trx: TenantDb, workspaceId: string, ids: readonly string[]) {
  return await trx
    .selectFrom('post_destinations')
    .select([
      'id',
      'post_id',
      'social_account_id',
      'provider',
      'publish_type',
      'state',
      'scheduled_at',
      'published_at',
      'remote_url',
      'last_error_code',
    ])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', 'in', ids)
    .orderBy('created_at')
    .orderBy('id')
    .execute();
}

type DestinationRow = Awaited<ReturnType<typeof loadDestinations>>[number];

interface SummaryParts {
  readonly main: MainRow | undefined;
  readonly destinations: readonly DestinationRow[];
  readonly tags: readonly PostTagRow[];
}

function summaryOf(post: PostRow, { main, destinations, tags }: SummaryParts): PostSummaryDto {
  return PostSummarySchema.parse({
    id: encodePublicId('post', post.id),
    version: post.version,
    title: post.title,
    publishSummary: post.publish_summary,
    scheduleMode: post.schedule_mode,
    scheduleLocal: plainLocal(post.schedule_local),
    scheduleTz: post.schedule_tz,
    tags: tags.map(tagFields),
    updatedAt: iso(post.updated_at),
    excerpt: main === undefined ? '' : excerptOf(main.doc as unknown as DocJson),
    mediaCount: Number(main?.media_count ?? 0),
    destinations: destinations.map((d) => ({
      id: encodePublicId('destination', d.id),
      accountId: encodePublicId('socialAccount', d.social_account_id),
      provider: d.provider,
      publishType: d.publish_type,
      state: d.state,
      scheduledAt: iso(d.scheduled_at),
      publishedAt: iso(d.published_at),
      remoteUrl: d.remote_url,
      lastErrorCode: d.last_error_code,
    })),
  });
}

export async function listPosts(
  trx: TenantDb,
  workspaceId: string,
  scope: AccessScope | null,
  filter: ListFilter,
): Promise<{ items: PostSummaryDto[]; truncated: boolean }> {
  const tagId = filter.tag === undefined ? undefined : decodePublicId('tag', filter.tag);
  const brand = brandFilter(filter.brand);
  const group = groupFilter(filter.group);
  if (tagId === null || brand === 'unknown' || group === 'unknown') {
    return { items: [], truncated: false };
  }
  const { rows, max } = await loadPosts(trx, { workspaceId, scope, tagId, brand, group }, filter);
  const posts = rows.slice(0, max);
  if (posts.length === 0) return { items: [], truncated: false };
  const ids = posts.map((post) => post.id);

  const items = await loadMains(trx, workspaceId, ids);
  const destinations = await loadDestinations(trx, workspaceId, ids);
  const tagsOf = await loadPostTags(trx, workspaceId, ids);

  const mainOf = new Map(items.map((item) => [item.post_id, item]));
  const destinationsOf = Map.groupBy(destinations, (d) => d.post_id);
  return {
    truncated: rows.length > max,
    items: posts.map((post) =>
      summaryOf(post, {
        main: mainOf.get(post.id),
        destinations: destinationsOf.get(post.id) ?? [],
        tags: tagsOf.get(post.id) ?? [],
      }),
    ),
  };
}

export function listRoutes(): BoundRoute[] {
  return [
    bindRoute(postListRoute, async ({ params, query }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const decision = ctx.authorize('posts:read', { workspaceId });
      const scope = decision.kind === 'allow_scoped' ? decision.scope : null;
      const filter = listFilter(query);
      if (filter.group !== undefined && hidesGroups(ctx.principal))
        throw denyError('scope_missing');
      const body = await ctx.tenant((trx) => listPosts(trx, workspaceId, scope, filter));
      return { body };
    }),
  ];
}
