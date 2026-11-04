import { defineRoute } from '@kronaut/contract';
import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { postResource } from '../../access/post-access/units.ts';
import { PostParams, pathId } from '../../base/http/params.ts';
import { type BoundRoute, bindRoute } from '../../base/http/request.ts';
import { SHORTENER_ERRORS, type ShortenerError } from './failure.ts';

const LinkState = z.enum(['pending', 'ready', 'failed']);

const PostShortLinksSchema = z.object({
  destinations: z.array(
    z.object({
      destinationId: z.string(),
      channelId: z.string(),
      shorten: z.boolean(),
      links: z.array(
        z.object({
          longUrl: z.string(),
          shortUrl: z.string().nullable(),
          state: LinkState,
          error: z.enum(SHORTENER_ERRORS).nullable(),
        }),
      ),
    }),
  ),
});

const postShortLinksRoute = defineRoute({
  id: 'short_links.post',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/posts/:postId/short-links',
  auth: ['session', 'grant'],
  action: 'posts:read',
  params: PostParams,
  response: PostShortLinksSchema,
  summary: "Read a post's short links",
  description:
    "Per destination: whether its frozen revision is shortened, and each long link with its short link. A pending link is shortened when the post is sent; a failed one names the error and is published as written. A link that isn't ready when the post is first sent stays long.",
  tags: ['short-links'],
});

function readDestinations(trx: TenantDb, workspaceId: string, postId: string) {
  return trx
    .selectFrom('post_destinations as d')
    .leftJoin('post_revisions as r', (join) =>
      join
        .onRef('r.workspace_id', '=', 'd.workspace_id')
        .onRef('r.post_id', '=', 'd.post_id')
        .onRef('r.post_version', '=', 'd.frozen_post_version'),
    )
    .select(['d.id', 'd.social_account_id'])
    .select(
      sql<boolean>`coalesce((
        select bool_or(coalesce((e->>'shorten')::boolean, false))
          from jsonb_array_elements(r.snapshot->'destinations') e
         where e->>'socialAccountId' = d.social_account_id::text
           and e->>'publishType' = d.publish_type), false)`.as('shorten'),
    )
    .where('d.workspace_id', '=', workspaceId)
    .where('d.post_id', '=', postId)
    .orderBy('d.id')
    .execute();
}

function readLinks(trx: TenantDb, workspaceId: string, ids: readonly string[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return trx
    .selectFrom('short_links')
    .select(['destination_id', 'long_url', 'short_url', 'state', 'error_code'])
    .where('workspace_id', '=', workspaceId)
    .where('destination_id', 'in', ids)
    .orderBy('created_at')
    .orderBy('url_sha256')
    .execute();
}

async function postShortLinks(trx: TenantDb, workspaceId: string, postId: string) {
  const destinations = await readDestinations(trx, workspaceId, postId);
  const links = await readLinks(
    trx,
    workspaceId,
    destinations.map((d) => d.id),
  );
  return PostShortLinksSchema.parse({
    destinations: destinations.map((d) => ({
      destinationId: encodePublicId('destination', d.id),
      channelId: encodePublicId('socialAccount', d.social_account_id),
      shorten: d.shorten,
      links: links
        .filter((link) => link.destination_id === d.id)
        .map((link) => ({
          longUrl: link.long_url,
          shortUrl: link.short_url,
          state: link.state,
          error: (link.error_code as ShortenerError | null) ?? null,
        })),
    })),
  });
}

export function bindPostShortLinks(): BoundRoute {
  return bindRoute(postShortLinksRoute, async ({ params }, ctx) => {
    const workspaceId = pathId('workspace', params.workspaceId);
    const postId = pathId('post', params.postId);
    const body = await ctx.tenant(async (trx) => {
      ctx.authorize('posts:read', await postResource(trx, workspaceId, postId));
      return await postShortLinks(trx, workspaceId, postId);
    });
    return { body };
  });
}
