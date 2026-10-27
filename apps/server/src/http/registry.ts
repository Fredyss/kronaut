import { createRegistry, type Route, type RouteRegistry } from '@kronaut/contract';
import { SELF_ACTION } from '@kronaut/core';
import type { BoundRoute } from './types.ts';

const WORKSPACE_SEGMENT = ':workspaceId';

export function scoped(route: Route): boolean {
  return route.path.split('/').includes(WORKSPACE_SEGMENT);
}

export function routeRegistry(routes: readonly BoundRoute[]): RouteRegistry {
  const registry = createRegistry();
  for (const { route } of routes) {
    registry.add(route);
    if (route.action === SELF_ACTION) {
      if (scoped(route) || route.auth.length !== 1 || route.auth[0] !== 'session') {
        throw new Error(`route ${route.id}: a self route is session-only and has no :workspaceId`);
      }
      continue;
    }
    const member = route.auth.includes('session') || route.auth.includes('grant');
    if (route.action !== null && member && !scoped(route)) {
      throw new Error(`route ${route.id}: an authorized session or grant route needs :workspaceId`);
    }
    if (route.idempotency && !scoped(route)) {
      throw new Error(`route ${route.id}: idempotency needs :workspaceId in the path`);
    }
  }
  return registry;
}
