import type { AnalyticsInput, AnalyticsResult, BaseContext, PostMetrics } from '@kronaut/core';
import * as z from 'zod';
import { countOf, eachPost } from '../_kit/analytics.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { graphCall } from './graph.ts';
import { GRAPH_VERSION } from './oauth.ts';
import { postId } from './publish.ts';
import { pageOf, readUrl } from './publish-input.ts';
import type { FacebookCredentials } from './runtime.ts';

const FIELDS =
  'shares,reactions.limit(0).summary(total_count),comments.limit(0).summary(total_count)';

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

export async function postAnalytics(
  ctx: BaseContext,
  input: AnalyticsInput<FacebookCredentials>,
): Promise<AnalyticsResult> {
  const page = pageOf(input);
  return eachPost(
    input.remoteIds,
    async (id) => {
      if (!postId.safeParse(id).success) throw permanent('remote_id_unsupported');
      const url = readUrl(page, id, { fields: FIELDS });
      return postMetrics(await graphCall(ctx, 'none', { url }, counts));
    },
    GRAPH_VERSION,
  );
}
