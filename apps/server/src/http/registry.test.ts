import { defineRoute } from '@kronaut/contract';
import { SELF_ACTION } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { routeRegistry } from './registry.ts';
import { bindRoute } from './types.ts';

describe('startup checks', () => {
  it('rejects an authorized session route without :workspaceId', () => {
    const route = defineRoute({
      id: 'probe.unscoped',
      method: 'GET',
      path: '/v1/probe/unscoped',
      auth: ['session', 'grant'],
      action: 'posts:read',
      response: z.object({}),
      summary: 'Unscoped',
    });
    expect(() => routeRegistry([bindRoute(route, async () => ({ body: {} }))])).toThrow(
      /needs :workspaceId/,
    );
  });

  it('keeps self routes session-only and unscoped', () => {
    const self = (path: string, auth: 'session' | ['session', 'grant']) =>
      bindRoute(
        defineRoute({
          id: 'probe.self',
          method: 'GET',
          path,
          auth,
          action: SELF_ACTION,
          ...(path.includes(':workspaceId')
            ? { params: z.object({ workspaceId: z.string() }) }
            : {}),
          response: z.object({}),
          summary: 'Self',
        }),
        async () => ({ body: {} }),
      );
    expect(() => routeRegistry([self('/v1/probe/self', 'session')])).not.toThrow();
    expect(() => routeRegistry([self('/v1/probe/self', ['session', 'grant'])])).toThrow(
      /session-only/,
    );
    expect(() => routeRegistry([self('/v1/workspaces/:workspaceId/self', 'session')])).toThrow(
      /session-only/,
    );
  });

  it('rejects idempotency without :workspaceId', () => {
    const route = defineRoute({
      id: 'probe.write',
      method: 'POST',
      path: '/v1/probe/write',
      auth: 'reviewer',
      action: 'comments:write',
      response: z.object({}),
      summary: 'Write',
    });
    expect(() => routeRegistry([bindRoute(route, async () => ({ body: {} }))])).toThrow(
      /idempotency/,
    );
  });
});
