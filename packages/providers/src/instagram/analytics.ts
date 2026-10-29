import type {
  AccountMetrics,
  AccountMetricsInput,
  AnalyticsInput,
  AnalyticsResult,
  BaseContext,
  PostMetrics,
} from '@kronaut/core';
import * as z from 'zod';
import { countOf, eachPost } from '../_kit/analytics.ts';
import { graphId } from '../_kit/meta-container-state.ts';
import { extraInsights, type InsightNames, insights } from '../_kit/meta-insights.ts';
import { GRAPH_VERSION, graphGet, graphUrl, INSIGHTS_SCOPE, permanent } from './oauth.ts';
import type { InstagramCredentials } from './runtime.ts';

const MEDIA_FIELDS = 'like_count,comments_count';
const STORY_INSIGHTS: InsightNames = {
  views: 'views',
  reach: 'reach',
  shares: 'shares',
  reposts: 'reposts',
};
const POST_INSIGHTS: InsightNames = { ...STORY_INSIGHTS, saved: 'bookmarks' };

const media = z.looseObject({ like_count: z.unknown(), comments_count: z.unknown() });
const account = z.looseObject({ followers_count: z.unknown() });

function readUrl(
  input: AccountMetricsInput<InstagramCredentials>,
  path: string,
  query: Readonly<Record<string, string>>,
): URL {
  return graphUrl(`/${GRAPH_VERSION}/${path}`, {
    ...query,
    access_token: input.credentials.accessToken,
  });
}

export function insightNames(postType: string | undefined): InsightNames {
  return postType === 'story' ? STORY_INSIGHTS : POST_INSIGHTS;
}

async function readMedia(
  ctx: BaseContext,
  input: AnalyticsInput<InstagramCredentials>,
  id: string,
): Promise<PostMetrics> {
  if (!graphId.safeParse(id).success) throw permanent('remote_id_invalid');
  const counts = await graphGet(ctx, 'none', readUrl(input, id, { fields: MEDIA_FIELDS }), media);
  const basic = { likes: countOf(counts.like_count), comments: countOf(counts.comments_count) };
  if (!input.credentials.scopes.includes(INSIGHTS_SCOPE)) return basic;
  const names = insightNames(input.postTypes[id]);
  const url = readUrl(input, `${id}/insights`, { metric: Object.keys(names).join(',') });
  return { ...basic, ...(await extraInsights(() => graphGet(ctx, 'none', url, insights), names)) };
}

export function mediaAnalytics(
  ctx: BaseContext,
  input: AnalyticsInput<InstagramCredentials>,
): Promise<AnalyticsResult> {
  return eachPost(input.remoteIds, (id) => readMedia(ctx, input, id), GRAPH_VERSION);
}

export async function accountMetrics(
  ctx: BaseContext,
  input: AccountMetricsInput<InstagramCredentials>,
): Promise<AccountMetrics> {
  const url = readUrl(input, 'me', { fields: 'followers_count' });
  const me = await graphGet(ctx, 'none', url, account);
  return { followers: countOf(me.followers_count), apiVersion: GRAPH_VERSION };
}
