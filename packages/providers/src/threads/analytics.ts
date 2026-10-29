import type {
  AccountMetrics,
  AccountMetricsInput,
  AnalyticsInput,
  AnalyticsResult,
  BaseContext,
  ProviderError,
} from '@kronaut/core';
import { eachPost } from '../_kit/analytics.ts';
import { graphId } from '../_kit/meta-container-state.ts';
import { graphGet, permanent } from '../_kit/meta-graph.ts';
import {
  type InsightNames,
  insightMetrics,
  insights,
  insightsOrNone,
  insightValue,
} from '../_kit/meta-insights.ts';
import { INSIGHTS_SCOPE } from './capabilities.ts';
import { GRAPH_VERSION, threadsUrl } from './oauth.ts';
import type { ThreadsCredentials } from './runtime.ts';

const POST_INSIGHTS: InsightNames = {
  views: 'views',
  likes: 'likes',
  replies: 'replies',
  reposts: 'reposts',
  quotes: 'quotes',
  shares: 'shares',
};
const METRIC = Object.keys(POST_INSIGHTS).join(',');
const NOT_GRANTED: ProviderError = { kind: 'permanent', code: 'insights_not_granted' };

function readUrl(
  input: AccountMetricsInput<ThreadsCredentials>,
  path: string,
  metric: string,
): URL {
  return threadsUrl(`/${GRAPH_VERSION}/${path}`, {
    metric,
    access_token: input.credentials.accessToken,
  });
}

function granted(input: AccountMetricsInput<ThreadsCredentials>): boolean {
  return input.credentials.scopes.includes(INSIGHTS_SCOPE);
}

export async function threadAnalytics(
  ctx: BaseContext,
  input: AnalyticsInput<ThreadsCredentials>,
): Promise<AnalyticsResult> {
  if (!granted(input)) {
    const failed = Object.fromEntries(input.remoteIds.map((id) => [id, NOT_GRANTED]));
    return { posts: {}, failed, apiVersion: GRAPH_VERSION };
  }
  return eachPost(
    input.remoteIds,
    async (id) => {
      if (!graphId.safeParse(id).success) throw permanent('remote_id_invalid');
      const url = readUrl(input, `${id}/insights`, METRIC);
      const body = await insightsOrNone(() => graphGet(ctx, 'none', url, insights));
      return insightMetrics(body, POST_INSIGHTS);
    },
    GRAPH_VERSION,
  );
}

export async function threadsFollowers(
  ctx: BaseContext,
  input: AccountMetricsInput<ThreadsCredentials>,
): Promise<AccountMetrics> {
  if (!granted(input)) return { followers: null, apiVersion: GRAPH_VERSION };
  const url = readUrl(input, `${input.credentials.userId}/threads_insights`, 'followers_count');
  const body = await graphGet(ctx, 'none', url, insights);
  return { followers: insightValue(body, 'followers_count'), apiVersion: GRAPH_VERSION };
}
