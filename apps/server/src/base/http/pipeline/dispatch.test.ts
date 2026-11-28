import type { Route } from '@kronaut/contract';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { dispatchRoute } from './dispatch.ts';
import type { Arrival } from './pipeline.ts';

const route = {
  id: 'analytics.post_metrics',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/posts/:postId/metrics',
} as unknown as Route;

function caller(seen: string[]) {
  return {
    reenter: (arrival: Arrival) => {
      seen.push(new URL(arrival.request.url).pathname);
      return Promise.resolve(Response.json({ ok: true }));
    },
    origin: 'https://kronaut.test',
    request: new Request('https://kronaut.test/v1/workspaces/w/mcp', { method: 'POST' }),
    requestId: 'req_1',
    logger: pino({ level: 'silent' }),
  };
}

describe('dispatchRoute', () => {
  it.each(['..', '.', ''])('refuses the path param %j without re-entering', async (postId) => {
    const seen: string[] = [];
    const reply = await dispatchRoute(caller(seen), {
      route,
      params: { workspaceId: 'w', postId },
    });
    expect(seen).toEqual([]);
    expect(reply.status).toBe(400);
    expect(reply.body).toMatchObject({
      error: { code: 'invalid_request', details: [{ path: 'params.postId' }] },
    });
  });

  it('keeps an encoded param inside its own route', async () => {
    const seen: string[] = [];
    const reply = await dispatchRoute(caller(seen), {
      route,
      params: { workspaceId: 'w', postId: '../x' },
    });
    expect(reply.status).toBe(200);
    expect(seen).toEqual(['/v1/workspaces/w/posts/..%2Fx/metrics']);
  });
});
