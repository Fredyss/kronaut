import { type DocJson, toPlainText } from '@kronaut/compose';
import { defineRoute } from '@kronaut/contract';
import { type AccessScope, decodePublicId, encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { pathId } from '../http/params.ts';
import { iso, plainLocal } from '../http/time.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { loadPostTags, type PostTagRow, tagFields } from '../tags/read.ts';
import { type PostSummaryDto, PostSummarySchema } from './dto.ts';
import { DRAFTS_DEFAULT_LIMIT, type ListFilter, ListQuery, listFilter } from './list-filter.ts';

export const RANGE_MAX_POSTS = 500;
const EXCERPT_GRAPHEMES = 140;

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
  description: `Either the posts with a destination scheduled in [from, to) (ISO instants, at most 42 days apart; at most ${RANGE_MAX_POSTS} posts), or with unscheduled=true the posts with no scheduled destination, newest first (limit 1–100, default ${DRAFTS_DEFAULT_LIMIT}). With tag, only the posts that have that tag; an unknown tag gives an empty list.`,
  tags: ['posts'],
});

const SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function excerptOf(doc: DocJson): string {
  const text = toPlainText(doc).replaceAll('\n', ' ').trim().normalize('NFC');
  let count = 0;
  for (const { index } of SEGMENTER.segment(text)) {
    if (count === EXCERPT_GRAPHEMES) return `${text.slice(0, index)}…`;
    count += 1;
  }
  return text;
}

function anyOf(ids: readonly string[]) {
  return sql`${[...ids]}::uuid[]`;
}

export function visibleIn(scope: AccessScope) {
  const accounts = anyOf(scope.socialAccountIds);
  const brands = anyOf(scope.brandIds);
  const locations = anyOf(scope.locationIds);
  return sql<boolean>`(
    (p.brand_id IS NULL OR coalesce(p.brand_id = ANY(${brands}) OR p.location_id = ANY(${locations}), false))
    AND (p.brand_id IS NOT NULL OR EXISTS (
      SELECT 1 FROM post_destinations s WHERE s.workspace_id = p.workspace_id AND s.post_id = p.id))
    AND NOT EXISTS (
      SELECT 1 FROM post_destinations s
      JOIN social_accounts a ON a.workspace_id = s.workspace_id AND a.id = s.social_account_id
      WHERE s.workspace_id = p.workspace_id AND s.post_id = p.id
        AND NOT coalesce(a.id = ANY(${accounts}) OR a.brand_id = ANY(${brands})
          OR a.location_id = ANY(${locations}), false)))`;
}

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
}

async function loadPosts(
  trx: TenantDb,
  { workspaceId, scope, tagId }: PostQuery,
  filter: ListFilter,
) {
  let query = trx
    .selectFrom('posts as p')
    .select(POST_COLUMNS)
    .where('p.workspace_id', '=', workspaceId)
    .where('p.deleted_at', 'is', null);
  if (scope !== null) query = query.where(visibleIn(scope));
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

export async function loadMains(trx: TenantDb, workspaceId: string, ids: readonly string[]) {
  return await trx
    .selectFrom('variant_items as i')
    .innerJoin('post_variants as v', (join) =>
      join.onRef('v.workspace_id', '=', 'i.workspace_id').onRef('v.id', '=', 'i.variant_id'),
    )
    .select((eb) => [
      'i.post_id',
      'i.doc',
      eb
        .selectFrom('item_media as m')
        .select(eb.fn.countAll<string>().as('n'))
        .whereRef('m.workspace_id', '=', 'i.workspace_id')
        .whereRef('m.item_id', '=', 'i.id')
        .as('media_count'),
    ])
    .where('i.workspace_id', '=', workspaceId)
    .where('i.post_id', 'in', ids)
    .where('i.role', '=', 'main')
    .where('v.is_default', '=', true)
    .execute();
}

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
  if (tagId === null) return { items: [], truncated: false };
  const { rows, max } = await loadPosts(trx, { workspaceId, scope, tagId }, filter);
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
      const body = await ctx.tenant((trx) => listPosts(trx, workspaceId, scope, filter));
      return { body };
    }),
  ];
}
