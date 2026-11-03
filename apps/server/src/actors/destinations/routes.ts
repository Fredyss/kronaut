import type { BoundRoute } from '../../base/http/request.ts';
import type { PostRouteDeps } from '../../flow/posts/deps.ts';
import { destinationCancelRoutes } from './cancel.ts';
import { markPublishedRoutes } from './mark-published.ts';
import { needsActionRoutes } from './needs-action.ts';
import { sendAgainRoutes } from './send-again.ts';

export function destinationRoutes(deps: PostRouteDeps): BoundRoute[] {
  return [
    ...needsActionRoutes(),
    ...markPublishedRoutes(),
    ...sendAgainRoutes(deps),
    ...destinationCancelRoutes(),
  ];
}
