import type { PublishContext } from '@kronaut/core';
import { type ErrorFacts, fail, type GraphFailure, metaGraph } from '../_kit/meta-graph-call.ts';
import { GRAPH_ORIGIN, GRAPH_VERSION } from './oauth.ts';

const LINK_LIMIT_EXCEEDED = 'THREADS_API__LINK_LIMIT_EXCEEDED';

function classifyThreads(
  _ctx: PublishContext,
  { body, withDetail }: ErrorFacts,
): GraphFailure | undefined {
  if (body === undefined || !JSON.stringify(body).includes(LINK_LIMIT_EXCEEDED)) return undefined;
  return fail({ kind: 'permanent', code: 'too_many_links', ...withDetail });
}

export const graph = metaGraph({
  origin: GRAPH_ORIGIN,
  version: GRAPH_VERSION,
  classify: classifyThreads,
});
