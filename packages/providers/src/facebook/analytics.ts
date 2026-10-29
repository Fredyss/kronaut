import type { AnalyticsInput, AnalyticsResult, BaseContext, PostMetrics } from '@kronaut/core';
import * as z from 'zod';
import { countOf, eachPost } from '../_kit/analytics.ts';
import { permanent } from '../_kit/meta-graph.ts';
import {
  type InsightNames,
  insightMetrics,
  insights,
  insightsOrNone,
} from '../_kit/meta-insights.ts';
import { graphCall } from './graph.ts';
import { GRAPH_VERSION, INSIGHTS_SCOPE } from './oauth.ts';
import { postId } from './publish.ts';
import { type PageAuth, pageOf, readUrl } from './publish-input.ts';
import type { FacebookCredentials } from './runtime.ts';

const FIELDS =
  'shares,reactions.limit(0).summary(total_count),comments.limit(0).summary(total_count)';

const POST_INSIGHTS: InsightNames = {
  post_media_view: 'views',
  post_total_media_view_unique: 'reach',
};
const INSIGHT_QUERY = { metric: Object.keys(POST_INSIGHTS).join(','), period: 'lifetime' };

const summary = z
  .looseObject({ summary: z.looseObject({ total_count: z.unknown() }) })
  .optional()
  .catch(undefined);
const counts = z.looseObject({
  shares: z.looseObject({ count: z.unknown() }).optional().catch(undefined),
  reactions: summary,
  comments: summary,
});

export function postMetrics(post: z.infer<typeof counts>): PostMetrics {
  return {
    shares: countOf(post.shares?.count),
    reactions: countOf(post.reactions?.summary.total_count),
    comments: countOf(post.comments?.summary.total_count),
  };
}

async function postInsights(ctx: BaseContext, page: PageAuth, id: string): Promise<PostMetrics> {
  const url = readUrl(page, `${id}/insights`, INSIGHT_QUERY);
  const body = await insightsOrNone(() => graphCall(ctx, 'none', { url }, insights));
  return insightMetrics(body, POST_INSIGHTS);
}

export async function postAnalytics(
  ctx: BaseContext,
  input: AnalyticsInput<FacebookCredentials>,
): Promise<AnalyticsResult> {
  const page = pageOf(input);
  const granted = input.credentials.scopes?.includes(INSIGHTS_SCOPE) === true;
  return eachPost(
    input.remoteIds,
    async (id) => {
      if (!postId.safeParse(id).success) throw permanent('remote_id_unsupported');
      const url = readUrl(page, id, { fields: FIELDS });
      const metrics = postMetrics(await graphCall(ctx, 'none', { url }, counts));
      return granted ? { ...metrics, ...(await postInsights(ctx, page, id)) } : metrics;
    },
    GRAPH_VERSION,
  );
}
