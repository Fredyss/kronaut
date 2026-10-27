import type { BoundRoute } from '../http/types.ts';
import type { PostRouteDeps } from '../posts/deps.ts';
import { decideRoutes } from './decide.ts';
import { listRoutes } from './list.ts';
import { policyRoutes } from './policy-routes.ts';
import { requestRoutes } from './request.ts';
import { withdrawRoutes } from './withdraw.ts';

export function approvalRoutes(deps: PostRouteDeps): BoundRoute[] {
  return [
    ...requestRoutes(deps),
    ...decideRoutes(),
    ...withdrawRoutes(),
    ...listRoutes(),
    ...policyRoutes(),
  ];
}
