import type { BoundRoute } from '../http/types.ts';
import { decideRoutes } from './decide.ts';
import { listRoutes } from './list.ts';
import { policyRoutes } from './policy-routes.ts';
import { withdrawRoutes } from './withdraw.ts';

export function approvalRoutes(): BoundRoute[] {
  return [...decideRoutes(), ...withdrawRoutes(), ...listRoutes(), ...policyRoutes()];
}
