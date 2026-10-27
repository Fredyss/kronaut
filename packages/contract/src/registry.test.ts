import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import type { HttpMethod } from './auth.ts';
import { defineRoute, type Route } from './define-route.ts';
import { toOpenApi } from './openapi.ts';
import { createRegistry } from './registry.ts';

const INFO = { title: 'Kronaut', version: '0.0.0' };

function route(
  id: string,
  method: HttpMethod,
  path: string,
  auth: 'session' | 'public' = 'session',
) {
  const names = [...path.matchAll(/:([^/]+)/g)].map((m) => m[1] ?? '');
  return defineRoute({
    id,
    method,
    path,
    auth,
    action: auth === 'public' ? null : 'posts:read',
    ...(names.length === 0
      ? {}
      : { params: z.object(Object.fromEntries(names.map((n) => [n, z.string()]))) }),
    response: z.null(),
    summary: id,
  });
}

describe('add', () => {
  it('returns the route it was given', () => {
    const registry = createRegistry();
    const r = route('posts.list', 'GET', '/v1/posts');
    expect(registry.add(r)).toBe(r);
  });

  it('rejects a duplicate id', () => {
    const registry = createRegistry();
    registry.add(route('posts.list', 'GET', '/v1/posts'));
    expect(() => registry.add(route('posts.list', 'GET', '/v1/other'))).toThrow(
      /duplicate route id/,
    );
  });

  it('rejects a duplicate method and path', () => {
    const registry = createRegistry();
    registry.add(route('posts.list', 'GET', '/v1/posts'));
    expect(() => registry.add(route('posts.index', 'GET', '/v1/posts'))).toThrow(
      /duplicate route GET \/v1\/posts/,
    );
  });

  it('rejects an ambiguous shape', () => {
    const registry = createRegistry();
    registry.add(route('posts.get', 'GET', '/v1/posts/:id'));
    expect(() => registry.add(route('posts.fetch', 'GET', '/v1/posts/:postId'))).toThrow(
      /ambiguous/,
    );
  });

  it('rejects an ambiguous shape with several params', () => {
    const registry = createRegistry();
    registry.add(route('media.get', 'GET', '/v1/posts/:id/media/:mediaId'));
    expect(() => registry.add(route('media.fetch', 'GET', '/v1/posts/:a/media/:b'))).toThrow(
      /ambiguous/,
    );
  });

  it('keeps routes registered when a later add fails', () => {
    const registry = createRegistry();
    registry.add(route('posts.get', 'GET', '/v1/posts/:id'));
    expect(() => registry.add(route('posts.fetch', 'GET', '/v1/posts/:postId'))).toThrow();
    expect(registry.all().map((r) => r.id)).toEqual(['posts.get']);
    expect(registry.get('posts.fetch')).toBeUndefined();
    expect(() => registry.add(route('posts.remove', 'DELETE', '/v1/posts/:id'))).not.toThrow();
  });

  it('rejects one path shape under different param names for different methods', () => {
    const registry = createRegistry();
    registry.add(route('posts.get', 'GET', '/v1/posts/:id'));
    expect(() => registry.add(route('posts.remove', 'DELETE', '/v1/posts/:postId'))).toThrow(
      /differs only in param names from \/v1\/posts\/:id/,
    );
    expect(registry.get('posts.remove')).toBeUndefined();
    expect(registry.all().map((r) => r.id)).toEqual(['posts.get']);
  });

  it('allows the same param names on one path under different methods', () => {
    const registry = createRegistry();
    registry.add(route('posts.get', 'GET', '/v1/posts/:id'));
    registry.add(route('posts.remove', 'DELETE', '/v1/posts/:id'));
    expect(registry.all()).toHaveLength(2);
  });

  it('rejects a route that defineRoute did not create', () => {
    const registry = createRegistry();
    const literal: Route = {
      id: 'admin.wipe',
      method: 'POST',
      path: '/admin',
      auth: ['session'],
      action: null,
      params: undefined,
      query: undefined,
      body: undefined,
      response: z.null(),
      status: 200,
      summary: '',
      tags: [],
      idempotency: false,
      bodyEncoding: 'json',
    };
    expect(() => registry.add(literal)).toThrow(/admin\.wipe was not created by defineRoute/);
    expect(registry.all()).toEqual([]);
  });

  it('rejects a spread copy of a defined route', () => {
    const registry = createRegistry();
    const copy: Route = { ...route('posts.list', 'GET', '/v1/posts'), action: null };
    expect(() => registry.add(copy)).toThrow(/posts\.list was not created by defineRoute/);
    expect(registry.all()).toEqual([]);
  });

  it('allows one path under different methods', () => {
    const registry = createRegistry();
    registry.add(route('posts.list', 'GET', '/v1/posts'));
    registry.add(route('posts.create', 'POST', '/v1/posts'));
    expect(registry.all()).toHaveLength(2);
  });

  it('allows params in different positions and different literals', () => {
    const registry = createRegistry();
    registry.add(route('a.get', 'GET', '/v1/a/:x/b'));
    registry.add(route('a.other', 'GET', '/v1/a/b/:x'));
    registry.add(route('c.get', 'GET', '/v1/c/:x/b'));
    expect(registry.all()).toHaveLength(3);
  });

  it('allows routes of different depth', () => {
    const registry = createRegistry();
    registry.add(route('posts.get', 'GET', '/v1/posts/:id'));
    registry.add(route('posts.media', 'GET', '/v1/posts/:id/media'));
    expect(registry.all()).toHaveLength(2);
  });
});

describe('get', () => {
  it('finds a route by id', () => {
    const registry = createRegistry();
    const r = registry.add(route('posts.list', 'GET', '/v1/posts'));
    expect(registry.get('posts.list')).toBe(r);
    expect(registry.get('posts.nope')).toBeUndefined();
  });
});

describe('all', () => {
  const routes = (): Route[] => [
    route('posts.get', 'GET', '/v1/posts/:id'),
    route('posts.update', 'PATCH', '/v1/posts/:id'),
    route('posts.delete', 'DELETE', '/v1/posts/:id'),
    route('posts.list', 'GET', '/v1/posts'),
    route('posts.create', 'POST', '/v1/posts'),
    route('channels.list', 'GET', '/v1/channels'),
    route('health.check', 'GET', '/healthz', 'public'),
  ];
  const EXPECTED = [
    'GET /healthz',
    'GET /v1/channels',
    'GET /v1/posts',
    'POST /v1/posts',
    'DELETE /v1/posts/:id',
    'GET /v1/posts/:id',
    'PATCH /v1/posts/:id',
  ];

  it('sorts by path then method', () => {
    const registry = createRegistry();
    for (const r of routes()) registry.add(r);
    expect(registry.all().map((r) => `${r.method} ${r.path}`)).toEqual(EXPECTED);
  });

  it('is independent of insertion order', () => {
    const registry = createRegistry();
    for (const r of routes().reverse()) registry.add(r);
    expect(registry.all().map((r) => `${r.method} ${r.path}`)).toEqual(EXPECTED);
  });

  it('returns a fresh array each time', () => {
    const registry = createRegistry();
    registry.add(route('posts.list', 'GET', '/v1/posts'));
    expect(registry.all()).not.toBe(registry.all());
  });
});

describe('publicRoutes', () => {
  it('lists sorted METHOD /path strings of public routes only', () => {
    const registry = createRegistry();
    registry.add(route('posts.list', 'GET', '/v1/posts'));
    registry.add(route('oauth.token', 'POST', '/oauth/token', 'public'));
    registry.add(route('ready.check', 'GET', '/readyz', 'public'));
    registry.add(route('health.check', 'GET', '/healthz', 'public'));
    expect(registry.publicRoutes()).toEqual(['GET /healthz', 'GET /readyz', 'POST /oauth/token']);
  });

  it('is empty without public routes', () => {
    const registry = createRegistry();
    registry.add(route('posts.list', 'GET', '/v1/posts'));
    expect(registry.publicRoutes()).toEqual([]);
  });
});

describe('openapi', () => {
  it('delegates to toOpenApi over the sorted routes', () => {
    const registry = createRegistry();
    registry.add(route('posts.list', 'GET', '/v1/posts'));
    registry.add(route('health.check', 'GET', '/healthz', 'public'));
    expect(registry.openapi(INFO)).toEqual(toOpenApi(registry.all(), INFO));
    expect(Object.keys(registry.openapi(INFO).paths)).toEqual(['/healthz', '/v1/posts']);
  });
});
