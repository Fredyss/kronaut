import type { BoundRoute } from '../http/request.ts';
import { decideRoutes } from './decide.ts';
import { listRoutes } from './list.ts';
import { withdrawRoutes } from './withdraw.ts';

export function approvalRoutes(): BoundRoute[] {
  return [...decideRoutes(), ...withdrawRoutes(), ...listRoutes()];
}
