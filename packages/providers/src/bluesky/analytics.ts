import {
  type AccountMetrics,
  type AccountMetricsInput,
  type AnalyticsInput,
  type AnalyticsResult,
  type BaseContext,
  type PostMetrics,
  ProviderFailure,
  type ProviderHttpResponse,
} from '@kronaut/core';
import * as z from 'zod';
import { countOf, NOT_FOUND, PostResults } from '../_kit/analytics.ts';
import { readJson, send } from '../_kit/http.ts';
import type { BlueskyCredentials } from './credentials.ts';
import { isSupportedDid, permanent } from './identity.ts';
import { blueskyManifest } from './manifest.ts';
import { resetAt } from './publish.ts';
import { POST_COLLECTION } from './publish-input.ts';

export const PUBLIC_APPVIEW = 'https://public.api.bsky.app';
const CHUNK = 25;
const API_VERSION = blueskyManifest.apiVersion.version;
const RKEY = /^[A-Za-z0-9._:~-]{1,512}$/;

const record = z.record(z.string(), z.unknown());
const postViews = z.looseObject({ posts: z.array(z.looseObject({ uri: z.string() })) });

function isPostUri(uri: string): boolean {
  const [scheme, empty, did, collection, rkey, ...rest] = uri.split('/');
  return (
    scheme === 'at:' &&
    empty === '' &&
    did !== undefined &&
    isSupportedDid(did) &&
    collection === POST_COLLECTION &&
    rkey !== undefined &&
    RKEY.test(rkey) &&
    rest.length === 0
  );
}

function failureOf(ctx: BaseContext, response: ProviderHttpResponse): ProviderFailure {
  const { status, headers } = response;
  if (status === 429)
    return new ProviderFailure({
      kind: 'rate_limited',
      scope: 'app',
      resetAt: resetAt(headers, ctx.now()),
    });
  if (status >= 400 && status < 500) return permanent(`http_${status}`);
  return new ProviderFailure({ kind: 'transient', detail: `http_${status}` });
}

async function query<T>(ctx: BaseContext, url: URL, schema: z.ZodType<T>): Promise<T> {
  const response = await send(ctx, 'none', url, { headers: { accept: 'application/json' } });
  if (response.status !== 200) throw failureOf(ctx, response);
  return readJson(response, schema, 'none');
}

function postMetrics(view: Readonly<Record<string, unknown>>): PostMetrics {
  return {
    likes: countOf(view.likeCount),
    reposts: countOf(view.repostCount),
    replies: countOf(view.replyCount),
    quotes: countOf(view.quoteCount),
    bookmarks: countOf(view.bookmarkCount),
  };
}

async function readChunk(ctx: BaseContext, uris: readonly string[], results: PostResults) {
  const url = new URL('/xrpc/app.bsky.feed.getPosts', PUBLIC_APPVIEW);
  for (const uri of uris) url.searchParams.append('uris', uri);
  try {
    const { posts } = await query(ctx, url, postViews);
    const byUri = new Map(posts.map((view) => [view.uri, view]));
    for (const uri of uris) {
      const view = byUri.get(uri);
      if (view === undefined) results.fail(uri, NOT_FOUND);
      else results.ok(uri, postMetrics(record.parse(view)));
    }
  } catch (error) {
    results.catch(uris, error);
  }
}

export async function postAnalytics(
  ctx: BaseContext,
  input: AnalyticsInput<BlueskyCredentials>,
): Promise<AnalyticsResult> {
  const results = new PostResults();
  const uris: string[] = [];
  for (const uri of new Set(input.remoteIds)) {
    if (isPostUri(uri)) uris.push(uri);
    else results.fail(uri, { kind: 'permanent', code: 'remote_id_invalid' });
  }
  for (let start = 0; start < uris.length; start += CHUNK) {
    await readChunk(ctx, uris.slice(start, start + CHUNK), results);
  }
  return results.result(API_VERSION);
}

export async function profileMetrics(
  ctx: BaseContext,
  input: AccountMetricsInput<BlueskyCredentials>,
): Promise<AccountMetrics> {
  const did = input.account.providerAccountId;
  if (!isSupportedDid(did)) throw permanent('account_id_invalid');
  const url = new URL('/xrpc/app.bsky.actor.getProfile', PUBLIC_APPVIEW);
  url.searchParams.set('actor', did);
  const profile = await query(ctx, url, record);
  return { followers: countOf(profile.followersCount), apiVersion: API_VERSION };
}
