import { defineRoute } from '@kronaut/contract';
import { createHttpClient, type HttpClient } from '@kronaut/egress';
import * as z from 'zod';
import { pathId } from '../../base/http/params.ts';
import { type BoundRoute, bindRoute } from '../../base/http/request.ts';
import type { ProviderRegistry } from '../../base/providers/providers.ts';
import { auditFeed, type FeedRef } from './audit.ts';
import { FEED_ERRORS, RSS_EGRESS } from './fetch.ts';
import { NAME_MAX, TEMPLATE_MAX, URL_MAX } from './input.ts';
import { createFeed, updateFeed } from './save.ts';
import { deleteFeed, feedDto, listFeeds, type StoredFeed, WORKSPACE_MAX } from './store.ts';

const PATH = '/v1/workspaces/:workspaceId/rss-feeds';
const FEED_PATH = `${PATH}/:feedId`;

const WorkspaceParams = z.object({ workspaceId: z.string() });
const FeedParams = z.object({ workspaceId: z.string(), feedId: z.string() });
const Mode = z.enum(['queue', 'draft']);
const ChannelIds = z.array(z.string()).min(1).max(50);

const RssFeedSchema = z.object({
  id: z.string(),
  url: z.string(),
  name: z.string(),
  channelIds: z.array(z.string()),
  mode: Mode,
  template: z.string(),
  state: z.enum(['active', 'paused']),
  pausedReason: z.enum(['manual', 'owner_lost', 'fetch_failing']).nullable(),
  lastCheckedAt: z.iso.datetime().nullable(),
  lastError: z.enum(FEED_ERRORS).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const SAVE_RULES = `The URL is an \`https\` link of up to ${URL_MAX} characters without credentials (422 url_invalid); the name has 1–${NAME_MAX} characters (422 name_invalid); the template is plain text of up to ${TEMPLATE_MAX} characters with {title}, {link} and {summary} (422 template_invalid). Every channel must be able to post text alone or text with one image (422 channel_unsupported) and, in queue mode, have queue slots (422 queue_empty).`;
const FIRST_CHECK =
  'A new URL is fetched at once (422 feed_unreachable or feed_invalid), and every item it lists is marked seen, so nothing old is posted.';

const rssFeedListRoute = defineRoute({
  id: 'rss_feeds.list',
  method: 'GET',
  path: PATH,
  auth: 'session',
  action: 'settings:write',
  params: WorkspaceParams,
  response: z.object({ items: z.array(RssFeedSchema) }),
  summary: 'List RSS feeds',
  description: "The workspace's feeds by name, with their URL. Owners and admins only.",
  tags: ['feeds'],
});

const rssFeedCreateRoute = defineRoute({
  id: 'rss_feeds.create',
  method: 'POST',
  path: PATH,
  auth: 'session',
  action: 'settings:write',
  params: WorkspaceParams,
  body: z.strictObject({
    url: z.string(),
    name: z.string(),
    channelIds: ChannelIds,
    mode: Mode,
    template: z.string().optional(),
  }),
  response: RssFeedSchema,
  status: 201,
  idempotency: true,
  summary: 'Add an RSS feed',
  description: `Each new item of an RSS 2.0 or Atom feed becomes a post on the feed's channels: the next free queue slot in queue mode, a draft in draft mode. The caller becomes the owner, re-authorized on every item. ${SAVE_RULES} ${FIRST_CHECK} The template defaults to "{title} {link}". At most ${WORKSPACE_MAX} feeds per workspace (409 rss_feed_limit). Owners and admins only.`,
  tags: ['feeds'],
});

const rssFeedUpdateRoute = defineRoute({
  id: 'rss_feeds.update',
  method: 'PATCH',
  path: FEED_PATH,
  auth: 'session',
  action: 'settings:write',
  params: FeedParams,
  body: z.strictObject({
    url: z.string().optional(),
    name: z.string().optional(),
    channelIds: ChannelIds.optional(),
    mode: Mode.optional(),
    template: z.string().optional(),
    paused: z.boolean().optional(),
  }),
  response: RssFeedSchema,
  idempotency: true,
  summary: 'Change, pause or resume an RSS feed',
  description: `The fields follow the same rules as when adding a feed; the caller becomes the owner. ${FIRST_CHECK} \`paused\` pauses or resumes the feed; a resumed feed posts what it missed, at most 5 items per check. Owners and admins only.`,
  tags: ['feeds'],
});

const rssFeedDeleteRoute = defineRoute({
  id: 'rss_feeds.delete',
  method: 'DELETE',
  path: FEED_PATH,
  auth: 'session',
  action: 'settings:write',
  params: FeedParams,
  response: z.undefined(),
  status: 204,
  idempotency: true,
  summary: 'Delete an RSS feed',
  description: 'The posts it made stay. Owners and admins only.',
  tags: ['feeds'],
});

export interface RssFeedRouteDeps {
  readonly providers: ProviderRegistry;
  readonly http?: HttpClient | undefined;
}

function feedRef(params: z.output<typeof FeedParams>): FeedRef {
  return {
    workspaceId: pathId('workspace', params.workspaceId),
    feedId: pathId('rssFeed', params.feedId),
  };
}

function feedBody(feed: StoredFeed) {
  return RssFeedSchema.parse(feedDto(feed));
}

export function rssFeedRoutes({
  providers,
  http = createHttpClient(RSS_EGRESS),
}: RssFeedRouteDeps): BoundRoute[] {
  const deps = { providers, http };
  return [
    bindRoute(rssFeedListRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('settings:write', { workspaceId });
      const feeds = await ctx.tenant((trx) => listFeeds(trx, workspaceId));
      return { body: { items: feeds.map(feedBody) } };
    }),
    bindRoute(rssFeedCreateRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('settings:write', { workspaceId });
      return { status: 201, body: feedBody(await createFeed(ctx, deps, workspaceId, body)) };
    }),
    bindRoute(rssFeedUpdateRoute, async ({ params, body }, ctx) => {
      const ref = feedRef(params);
      ctx.authorize('settings:write', { workspaceId: ref.workspaceId });
      return { body: feedBody(await updateFeed(ctx, deps, ref, body)) };
    }),
    bindRoute(rssFeedDeleteRoute, async ({ params }, ctx) => {
      const ref = feedRef(params);
      ctx.authorize('settings:write', { workspaceId: ref.workspaceId });
      await ctx.tenant(async (trx) => {
        await deleteFeed(trx, ref);
        await auditFeed(trx, ctx, { ref, action: 'rss_feed.deleted' });
      });
      return { body: undefined };
    }),
  ];
}
