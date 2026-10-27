import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { HttpError } from './errors.ts';
import type { HttpDeps } from './kernel.ts';
import { type BoundRoute, bindRoute } from './types.ts';

export const healthRoute = defineRoute({
  id: 'system.health',
  method: 'GET',
  path: '/healthz',
  auth: 'public',
  action: null,
  response: z.object({ status: z.literal('ok') }),
  summary: 'Liveness probe',
  tags: ['system'],
});

export const readyRoute = defineRoute({
  id: 'system.ready',
  method: 'GET',
  path: '/readyz',
  auth: 'public',
  action: null,
  response: z.object({ status: z.literal('ready') }),
  summary: 'Readiness probe',
  tags: ['system'],
});

export function systemRoutes(deps: Pick<HttpDeps, 'readiness'>): BoundRoute[] {
  return [
    bindRoute(healthRoute, async () => ({ body: { status: 'ok' as const } })),
    bindRoute(readyRoute, async (_input, ctx) => {
      let ready = false;
      try {
        ready = await deps.readiness();
      } catch (err) {
        ctx.logger.warn({ err }, 'readiness check failed');
      }
      if (!ready) throw new HttpError('unavailable', 'The service is not ready.');
      return { body: { status: 'ready' as const } };
    }),
  ];
}
