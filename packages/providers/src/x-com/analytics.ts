import {
  type AccountMetrics,
  type AccountMetricsInput,
  type AnalyticsInput,
  type AnalyticsResult,
  type BaseContext,
  isProviderFailure,
  type PostMetrics,
  type ProviderError,
  ProviderFailure,
} from '@kronaut/core';
import * as z from 'zod';
import { countOf, NOT_FOUND, PostResults } from '../_kit/analytics.ts';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { profileOf, readMe, X_ID } from './connect.ts';
import { isSuccess, problemName, xFailure } from './errors.ts';
import { xManifest } from './manifest.ts';
import { API_BASE, type XCredentials } from './oauth.ts';

const CHUNK = 100;
const API_VERSION = xManifest.apiVersion.version;
const NOT_IN_RESPONSE = { kind: 'transient', detail: 'not_in_response' } as const;
const PROTECTED = 'not-authorized-for-resource';

const publicMetrics = z.looseObject({
  like_count: z.unknown().optional(),
  retweet_count: z.unknown().optional(),
  repost_count: z.unknown().optional(),
  reply_count: z.unknown().optional(),
  quote_count: z.unknown().optional(),
  bookmark_count: z.unknown().optional(),
  impression_count: z.unknown().optional(),
});
type Counts = z.infer<typeof publicMetrics>;
const lookup = z.looseObject({
  data: z
    .array(
      z.looseObject({ id: z.string(), public_metrics: publicMetrics.optional().catch(undefined) }),
    )
    .optional(),
  errors: z
    .array(
      z.looseObject({
        resource_id: z.string().optional(),
        value: z.string().optional(),
        type: z.string().optional(),
      }),
    )
    .optional(),
});
type Problem = NonNullable<z.infer<typeof lookup>['errors']>[number];

function metricsOf(counts: Counts | undefined): PostMetrics {
  return {
    likes: countOf(counts?.like_count),
    reposts: countOf(counts?.retweet_count ?? counts?.repost_count),
    replies: countOf(counts?.reply_count),
    quotes: countOf(counts?.quote_count),
    bookmarks: countOf(counts?.bookmark_count),
    views: countOf(counts?.impression_count),
  };
}

// X's policy treats a post made private like a deleted one: what Kronaut stored about it has to go.
function problemError(entry: Problem): ProviderError {
  const name = problemName(entry.type);
  if (name === 'resource-not-found') return NOT_FOUND;
  if (name === PROTECTED) return { kind: 'permanent', code: 'not_found', detail: PROTECTED };
  return { kind: 'transient', detail: name ?? 'unknown_problem' };
}

// A 404 for the whole request says nothing about any one post, and a missing post loses its stored metrics.
function requestFailure(error: unknown): unknown {
  if (!isProviderFailure(error)) return error;
  const failure = error.error;
  if (failure.kind !== 'permanent' || failure.code !== 'not_found') return error;
  return new ProviderFailure({ kind: 'transient', detail: failure.detail ?? 'http_404' });
}

async function readChunk(
  ctx: BaseContext,
  token: string,
  ids: readonly string[],
  results: PostResults,
): Promise<void> {
  const url = `${API_BASE}/tweets?ids=${ids.join(',')}&tweet.fields=public_metrics`;
  try {
    const response = await send(ctx, 'none', url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!isSuccess(response.status)) throw await xFailure(response, 'none', ctx.now());
    const { data, errors } = await readJson(response, lookup, 'none');
    const found = new Map((data ?? []).map((post) => [post.id, post.public_metrics]));
    const failed = new Map(
      (errors ?? []).map((entry) => [entry.resource_id ?? entry.value, problemError(entry)]),
    );
    for (const id of ids) {
      if (found.has(id)) results.ok(id, metricsOf(found.get(id)));
      else results.fail(id, failed.get(id) ?? NOT_IN_RESPONSE);
    }
  } catch (error) {
    results.catch(ids, requestFailure(error));
  }
}

export async function postAnalytics(
  ctx: BaseContext,
  input: AnalyticsInput<XCredentials>,
): Promise<AnalyticsResult> {
  const results = new PostResults();
  const ids: string[] = [];
  for (const id of new Set(input.remoteIds)) {
    if (X_ID.test(id)) ids.push(id);
    else results.fail(id, { kind: 'permanent', code: 'remote_id_invalid' });
  }
  for (let start = 0; start < ids.length; start += CHUNK) {
    await readChunk(ctx, input.credentials.accessToken, ids.slice(start, start + CHUNK), results);
  }
  return results.result(API_VERSION);
}

export async function accountMetrics(
  ctx: BaseContext,
  input: AccountMetricsInput<XCredentials>,
): Promise<AccountMetrics> {
  const user = await readMe(ctx, input.credentials.accessToken, '?user.fields=public_metrics');
  if (user.id !== input.account.providerAccountId) throw permanent('channel_missing');
  return {
    followers: countOf(user.public_metrics?.followers_count),
    apiVersion: API_VERSION,
    profile: profileOf(user),
  };
}
