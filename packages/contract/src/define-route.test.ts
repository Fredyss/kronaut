import type { Action } from '@kronaut/core';
import { describe, expect, expectTypeOf, it } from 'vitest';
import * as z from 'zod';
import type { AuthMode, HttpMethod } from './auth.ts';
import {
  defineRoute,
  type ObjectSchema,
  type Route,
  type RouteAuth,
  type RouteDefinition,
} from './define-route.ts';

type AnyDef = RouteDefinition<
  ObjectSchema | undefined,
  ObjectSchema | undefined,
  z.ZodType | undefined,
  z.ZodType
>;

const BASE: AnyDef = {
  id: 'posts.list',
  method: 'GET',
  path: '/v1/posts',
  auth: 'session',
  action: 'posts:read',
  response: z.array(z.string()),
  summary: 'List posts',
};

function make(over: Partial<AnyDef> = {}) {
  return defineRoute({ ...BASE, ...over });
}

function paramsFor(path: string): Partial<AnyDef> {
  const names = [...path.matchAll(/:([^/]+)/g)].map((m) => m[1] ?? '');
  if (names.length === 0) return {};
  return { params: z.object(Object.fromEntries(names.map((n) => [n, z.string()]))) };
}

describe('id', () => {
  it.each(['posts.list', 'posts.bulk_update', 'review.post.get'])('accepts %s', (id) => {
    expect(make({ id }).id).toBe(id);
  });

  it.each([
    'posts',
    'Posts.list',
    'posts.List',
    'posts.',
    '.list',
    '1posts.list',
    'posts.list-all',
    'posts..list',
    'posts.list2',
    '_posts.list',
    'posts list.all',
    '',
  ])('rejects %j', (id) => {
    expect(() => make({ id })).toThrow(TypeError);
  });

  it('names the route in every error', () => {
    expect(() => make({ id: 'posts.list', summary: '' })).toThrow('posts.list');
    expect(() => make({ id: 'Bad Id' })).toThrow('Bad Id');
  });
});

describe('path', () => {
  it.each([
    '/v1/posts',
    '/v1/posts/:id',
    '/v1/posts/:id/media/:mediaId',
    '/v1/a.b/c_d-e/9',
    '/healthz',
    '/readyz',
    '/.well-known/jwks.json',
    '/oauth/callback/:provider',
  ])('accepts %s', (path) => {
    expect(make({ path, ...paramsFor(path) }).path).toBe(path);
  });

  it.each([
    ['no leading slash', 'v1/posts'],
    ['unknown version', '/v2/posts'],
    ['bare version', '/v1'],
    ['version with trailing slash', '/v1/'],
    ['trailing slash', '/v1/posts/'],
    ['empty segment', '/v1//posts'],
    ['uppercase literal', '/v1/Posts'],
    ['space', '/v1/po sts'],
    ['query string', '/v1/posts?x=1'],
    ['uppercase param start', '/v1/posts/:Id'],
    ['bare colon', '/v1/posts/:'],
    ['digit-led param', '/v1/posts/:1a'],
    ['param with underscore', '/v1/posts/:post_id'],
    ['duplicate param', '/v1/posts/:id/media/:id'],
    ['dot segment', '/v1/./posts'],
    ['dot-dot segment', '/v1/../healthz'],
    ['dot-dot segment under oauth', '/oauth/../x'],
    ['unversioned', '/posts'],
    ['healthz with suffix', '/healthz/live'],
    ['healthz with trailing slash', '/healthz/'],
    ['readyz with suffix', '/readyz/db'],
    ['well-known without tail', '/.well-known'],
    ['well-known with empty tail', '/.well-known/'],
    ['oauth without tail', '/oauth'],
    ['oauth with empty tail', '/oauth/'],
    ['oauth lookalike', '/oauthx/callback'],
  ])('rejects %s', (_label, path) => {
    expect(() => make({ path, ...paramsFor(path) })).toThrow(/path/);
  });
});

describe('params', () => {
  it('accepts params that match the path params exactly', () => {
    const params = z.object({ id: z.string(), mediaId: z.string() });
    const route = make({ path: '/v1/posts/:id/media/:mediaId', params });
    expect(route.params).toBe(params);
  });

  it('accepts params in a different key order than the path', () => {
    const params = z.object({ mediaId: z.string(), id: z.string() });
    expect(make({ path: '/v1/posts/:id/media/:mediaId', params }).params).toBe(params);
  });

  it('rejects a path with params and no params schema', () => {
    expect(() => make({ path: '/v1/posts/:id' })).toThrow(/params is required/);
  });

  it('rejects params that are missing a path param', () => {
    expect(() =>
      make({ path: '/v1/posts/:id/media/:mediaId', params: z.object({ id: z.string() }) }),
    ).toThrow(/must equal/);
  });

  it('rejects params with an extra key', () => {
    expect(() =>
      make({
        path: '/v1/posts/:id',
        params: z.object({ id: z.string(), extra: z.string() }),
      }),
    ).toThrow(/must equal/);
  });

  it('rejects params with a different key', () => {
    expect(() => make({ path: '/v1/posts/:id', params: z.object({ postId: z.string() }) })).toThrow(
      /must equal/,
    );
  });

  it('rejects params on a path without params', () => {
    expect(() => make({ params: z.object({}) })).toThrow(/omitted/);
    expect(() => make({ params: z.object({ id: z.string() }) })).toThrow(TypeError);
  });

  it('rejects params that are not a z.object', () => {
    const notObject = z.string() as unknown as ObjectSchema;
    expect(() => make({ path: '/v1/posts/:id', params: notObject })).toThrow(/z\.object/);
    const plain = { shape: { id: z.string() } } as unknown as ObjectSchema;
    expect(() => make({ path: '/v1/posts/:id', params: plain })).toThrow(/z\.object/);
  });

  it('accepts strict and loose objects', () => {
    expect(make({ path: '/v1/posts/:id', params: z.strictObject({ id: z.string() }) }).path).toBe(
      '/v1/posts/:id',
    );
    expect(make({ path: '/v1/posts/:id', params: z.looseObject({ id: z.string() }) }).path).toBe(
      '/v1/posts/:id',
    );
  });
});

describe('query', () => {
  it('accepts a z.object and rejects anything else', () => {
    const query = z.object({ limit: z.string().optional() });
    expect(make({ query }).query).toBe(query);
    expect(() => make({ query: z.string() as unknown as ObjectSchema })).toThrow(/query/);
  });
});

describe('auth', () => {
  it('normalises a single mode to a one-element array', () => {
    expect(make({ auth: 'session' }).auth).toEqual(['session']);
    expect(make({ auth: ['grant'] }).auth).toEqual(['grant']);
  });

  it('keeps the order of several modes', () => {
    expect(make({ auth: ['grant', 'session'] }).auth).toEqual(['grant', 'session']);
    expect(make({ auth: ['session', 'grant', 'reviewer'] }).auth).toEqual([
      'session',
      'grant',
      'reviewer',
    ]);
  });

  it('copies the input array', () => {
    const auth: AuthMode[] = ['session'];
    const route = make({ auth });
    auth.push('grant');
    expect(route.auth).toEqual(['session']);
  });

  it('rejects an empty list', () => {
    expect(() => make({ auth: [] })).toThrow(/empty/);
  });

  it('rejects duplicates', () => {
    expect(() => make({ auth: ['session', 'session'] })).toThrow(/repeat/);
  });

  it('rejects an unknown mode', () => {
    expect(() => make({ auth: 'cookie' as unknown as AuthMode })).toThrow(/unknown auth mode/);
  });

  it.each<[readonly AuthMode[]]>([[['public', 'session']], [['session', 'public']]])(
    'rejects public next to other modes: %j',
    (auth) => {
      expect(() => make({ auth, action: null })).toThrow(/stand alone/);
    },
  );

  it('accepts public alone', () => {
    expect(make({ auth: 'public', action: null }).auth).toEqual(['public']);
    expect(make({ auth: ['public'], action: null }).auth).toEqual(['public']);
  });
});

describe('action', () => {
  it('requires null on public routes', () => {
    expect(make({ auth: 'public', action: null }).action).toBeNull();
    expect(() => make({ auth: 'public', action: 'posts:read' })).toThrow(/action null/);
  });

  it('requires a known action on every other route', () => {
    expect(make({ auth: 'session', action: 'posts:read' }).action).toBe('posts:read');
    expect(make({ auth: ['session', 'grant'], action: 'posts:draft' }).action).toBe('posts:draft');
    expect(make({ auth: 'reviewer', action: 'approvals:decide' }).action).toBe('approvals:decide');
    expect(() => make({ auth: 'session', action: null })).toThrow(/known action/);
    expect(() => make({ auth: ['session', 'grant'], action: null })).toThrow(/known action/);
    expect(() => make({ auth: 'reviewer', action: null })).toThrow(/known action/);
    expect(() => make({ auth: 'session', action: 'posts:write' as Action })).toThrow(
      /known action/,
    );
  });
});

describe('body', () => {
  const body = z.object({ title: z.string() });

  it.each<HttpMethod>(['POST', 'PUT', 'PATCH'])('accepts a body on %s', (method) => {
    expect(make({ method, body }).body).toBe(body);
  });

  it.each<HttpMethod>(['GET', 'DELETE'])('rejects a body on %s', (method) => {
    expect(() => make({ method, body })).toThrow(/must not have a body/);
  });

  it('allows body-less writes', () => {
    expect(make({ method: 'POST' }).body).toBeUndefined();
  });
});

describe('idempotency', () => {
  it.each<[HttpMethod, AuthMode | readonly AuthMode[], boolean]>([
    ['GET', 'session', false],
    ['GET', ['session', 'grant'], false],
    ['GET', 'reviewer', false],
    ['GET', 'public', false],
    ['POST', 'session', true],
    ['POST', ['session', 'grant'], true],
    ['POST', 'reviewer', true],
    ['POST', 'public', false],
    ['PUT', 'session', true],
    ['PATCH', 'grant', true],
    ['DELETE', 'session', true],
    ['DELETE', 'public', false],
  ])('defaults %s %j to %s', (method, auth, expected) => {
    const isPublic = auth === 'public';
    const route = make({ method, auth, action: isPublic ? null : 'posts:read' });
    expect(route.idempotency).toBe(expected);
  });

  it('can be switched off on a write', () => {
    expect(make({ method: 'POST', idempotency: false }).idempotency).toBe(false);
  });

  it('can be switched on for a non-GET authenticated route', () => {
    expect(make({ method: 'PATCH', idempotency: true }).idempotency).toBe(true);
  });

  it('rejects true on GET', () => {
    expect(() => make({ method: 'GET', idempotency: true })).toThrow(/GET/);
  });

  it('rejects true on a public route', () => {
    expect(() => make({ method: 'POST', auth: 'public', action: null, idempotency: true })).toThrow(
      /public/,
    );
  });

  it('accepts false on GET and public routes', () => {
    expect(make({ method: 'GET', idempotency: false }).idempotency).toBe(false);
    expect(
      make({ method: 'POST', auth: 'public', action: null, idempotency: false }).idempotency,
    ).toBe(false);
  });
});

describe('bodyEncoding', () => {
  const octet = {
    method: 'PUT',
    body: z.instanceof(Uint8Array),
    bodyEncoding: 'octet-stream',
    idempotency: false,
  } as const;

  it('defaults to json', () => {
    expect(make({ method: 'POST', body: z.object({}) }).bodyEncoding).toBe('json');
  });

  it('accepts an octet-stream route with a body and idempotency off', () => {
    expect(make(octet).bodyEncoding).toBe('octet-stream');
  });

  it('rejects an octet-stream route without a body', () => {
    expect(() => make({ ...octet, body: undefined })).toThrow(/needs a body/);
  });

  it('rejects an octet-stream route with idempotency', () => {
    expect(() => make({ ...octet, idempotency: true })).toThrow(/idempotency false/);
    const { idempotency: _off, ...defaulted } = octet;
    expect(() => make(defaulted)).toThrow(/idempotency false/);
  });
});

describe('summary', () => {
  it('must not be empty', () => {
    expect(make({ summary: 'List' }).summary).toBe('List');
    expect(() => make({ summary: '' })).toThrow(/summary/);
    expect(() => make({ summary: '  ' })).toThrow(/summary/);
  });
});

describe('normalised fields', () => {
  it('defaults status to 200 and tags to an empty list', () => {
    const route = make();
    expect(route.status).toBe(200);
    expect(route.tags).toEqual([]);
  });

  it.each([200, 201, 202, 204] as const)('keeps status %i', (status) => {
    expect(make({ status }).status).toBe(status);
  });

  it('keeps tags and copies the input array', () => {
    const tags = ['posts', 'drafts'];
    const route = make({ tags });
    tags.push('other');
    expect(route.tags).toEqual(['posts', 'drafts']);
  });

  it('leaves description out unless set', () => {
    expect('description' in make()).toBe(false);
    expect(make({ description: 'Lists posts.' }).description).toBe('Lists posts.');
  });

  it('keeps the schemas by reference', () => {
    const response = z.object({ id: z.string() });
    expect(make({ response }).response).toBe(response);
  });
});

describe('frozen', () => {
  const route = make({ tags: ['posts'], method: 'POST', body: z.object({ title: z.string() }) });

  it('freezes the route, auth and tags', () => {
    expect(Object.isFrozen(route)).toBe(true);
    expect(Object.isFrozen(route.auth)).toBe(true);
    expect(Object.isFrozen(route.tags)).toBe(true);
  });

  it('rejects writes', () => {
    expect(() => {
      (route as { summary: string }).summary = 'other';
    }).toThrow(TypeError);
    expect(() => Array.prototype.push.call(route.auth, 'public')).toThrow(TypeError);
    expect(() => Array.prototype.push.call(route.tags, 'other')).toThrow(TypeError);
  });
});

describe('types', () => {
  it('carries the zod types through the Route generics', () => {
    const route = defineRoute({
      id: 'posts.update',
      method: 'PATCH',
      path: '/v1/posts/:id',
      auth: ['session', 'grant'],
      action: 'posts:draft',
      params: z.object({ id: z.string() }),
      query: z.object({ dryRun: z.boolean().optional() }),
      body: z.object({ title: z.string(), tags: z.array(z.string()) }),
      response: z.object({ id: z.string(), version: z.number().int() }),
      summary: 'Update a post',
    });

    expectTypeOf<z.infer<typeof route.params>>().toEqualTypeOf<{ id: string }>();
    expectTypeOf<z.infer<typeof route.query>>().toEqualTypeOf<{ dryRun?: boolean | undefined }>();
    expectTypeOf<z.infer<typeof route.body>>().toEqualTypeOf<{
      title: string;
      tags: string[];
    }>();
    expectTypeOf<z.infer<typeof route.response>>().toEqualTypeOf<{
      id: string;
      version: number;
    }>();
    expectTypeOf(route.auth).toEqualTypeOf<RouteAuth>();
    expectTypeOf(route).toExtend<Route>();
  });

  it('types omitted schemas as undefined', () => {
    const route = defineRoute({
      id: 'posts.list',
      method: 'GET',
      path: '/v1/posts',
      auth: 'session',
      action: 'posts:read',
      response: z.array(z.string()),
      summary: 'List posts',
    });

    expectTypeOf(route.params).toEqualTypeOf<undefined>();
    expectTypeOf(route.query).toEqualTypeOf<undefined>();
    expectTypeOf(route.body).toEqualTypeOf<undefined>();
    expectTypeOf<z.infer<typeof route.response>>().toEqualTypeOf<string[]>();
    expectTypeOf(route).toExtend<Route>();
  });
});
