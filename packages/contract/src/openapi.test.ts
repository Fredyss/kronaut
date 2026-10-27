import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { defineRoute, type Route } from './define-route.ts';
import { toOpenApi } from './openapi.ts';
import { createRegistry } from './registry.ts';

const INFO = { title: 'Kronaut', version: '1.2.3' };

const health = defineRoute({
  id: 'health.live',
  method: 'GET',
  path: '/healthz',
  auth: 'public',
  action: null,
  response: z.object({ status: z.literal('ok') }),
  summary: 'Liveness probe',
});

const postGet = defineRoute({
  id: 'posts.get',
  method: 'GET',
  path: '/v1/posts/:id',
  auth: ['session', 'grant'],
  action: 'posts:read',
  params: z.object({ id: z.string().min(1) }),
  query: z.object({
    locale: z.enum(['en', 'sk', 'cs']),
    fields: z.string().optional(),
    page: z.number().int().default(1),
  }),
  response: z.object({ id: z.string(), title: z.string() }),
  summary: 'Get a post',
  description: 'Returns one post.',
  tags: ['posts'],
});

const postCreate = defineRoute({
  id: 'posts.create',
  method: 'POST',
  path: '/v1/posts',
  auth: 'session',
  action: 'posts:draft',
  body: z.object({ title: z.string(), tags: z.array(z.string()).default([]) }),
  response: z.object({ id: z.string() }),
  status: 201,
  summary: 'Create a post',
  tags: ['posts'],
});

const reviewGet = defineRoute({
  id: 'review.get_post',
  method: 'GET',
  path: '/v1/review/:token/posts/:postId',
  auth: 'reviewer',
  action: 'posts:read',
  params: z.object({ token: z.string(), postId: z.string() }),
  response: z.object({ id: z.string() }),
  summary: 'Get a post under review',
});

const postDelete = defineRoute({
  id: 'posts.delete',
  method: 'DELETE',
  path: '/v1/posts/:id',
  auth: ['session', 'grant', 'reviewer'],
  action: 'posts:cancel',
  params: z.object({ id: z.string() }),
  response: z.null(),
  status: 204,
  summary: 'Delete a post',
});

const ALL: readonly Route[] = [health, postGet, postCreate, reviewGet, postDelete];

function keysDeep(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysDeep);
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...keysDeep(child)]);
}

const doc = toOpenApi(ALL, INFO);

describe('document', () => {
  it('declares OpenAPI 3.1.0 with the given info', () => {
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info).toEqual({ title: 'Kronaut', version: '1.2.3' });
  });

  it('keys paths in OpenAPI form, sorted, with lowercase methods', () => {
    expect(Object.keys(doc.paths)).toEqual([
      '/healthz',
      '/v1/posts',
      '/v1/posts/{id}',
      '/v1/review/{token}/posts/{postId}',
    ]);
    expect(Object.keys(doc.paths['/v1/posts/{id}'] ?? {})).toEqual(['delete', 'get']);
    expect(Object.keys(doc.paths['/v1/posts'] ?? {})).toEqual(['post']);
  });

  it('defines the ApiError schema and the three security schemes', () => {
    expect(doc.components.schemas.ApiError).toEqual({
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            requestId: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: { path: { type: 'string' }, code: { type: 'string' } },
                required: ['path', 'code'],
                additionalProperties: false,
              },
            },
          },
          required: ['code', 'message'],
          additionalProperties: false,
        },
      },
      required: ['error'],
      additionalProperties: false,
    });
    expect(doc.components.securitySchemes).toEqual({
      session: { type: 'apiKey', in: 'cookie', name: '__Host-kronaut_session' },
      grant: { type: 'http', scheme: 'bearer' },
      reviewer: { type: 'apiKey', in: 'cookie', name: '__Host-kronaut_review' },
    });
  });

  it('never embeds a $schema key', () => {
    expect(keysDeep(doc)).not.toContain('$schema');
  });

  it('is plain JSON', () => {
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });
});

describe('operations', () => {
  const op = (path: string, method: string) => {
    const found = doc.paths[path]?.[method];
    if (found === undefined) throw new Error(`no operation ${method} ${path}`);
    return found;
  };

  it('describes a public GET without parameters, security or idempotency', () => {
    expect(op('/healthz', 'get')).toEqual({
      operationId: 'health.live',
      summary: 'Liveness probe',
      tags: [],
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string', const: 'ok' } },
                required: ['status'],
                additionalProperties: false,
              },
            },
          },
        },
        default: {
          description: 'Error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
      },
      security: [],
      'x-kronaut-action': null,
      'x-kronaut-auth': ['public'],
    });
  });

  it('describes path and query parameters of a session and grant GET', () => {
    const get = op('/v1/posts/{id}', 'get');
    expect(get.operationId).toBe('posts.get');
    expect(get.summary).toBe('Get a post');
    expect(get.description).toBe('Returns one post.');
    expect(get.tags).toEqual(['posts']);
    expect(get.parameters).toEqual([
      { name: 'id', in: 'path', required: true, schema: { type: 'string', minLength: 1 } },
      {
        name: 'locale',
        in: 'query',
        required: true,
        schema: { type: 'string', enum: ['en', 'sk', 'cs'] },
      },
      { name: 'fields', in: 'query', required: false, schema: { type: 'string' } },
      {
        name: 'page',
        in: 'query',
        required: false,
        schema: {
          type: 'integer',
          default: 1,
          minimum: -9007199254740991,
          maximum: 9007199254740991,
        },
      },
    ]);
    expect(get.requestBody).toBeUndefined();
    expect(get.security).toEqual([{ session: [] }, { grant: [] }]);
    expect(get['x-kronaut-action']).toBe('posts:read');
    expect(get['x-kronaut-auth']).toEqual(['session', 'grant']);
    expect(Object.keys(get.responses)).toEqual(['200', 'default']);
  });

  it('describes a POST with an idempotency header, body and 201', () => {
    const post = op('/v1/posts', 'post');
    expect(post.parameters).toEqual([
      {
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        schema: { type: 'string', minLength: 1, maxLength: 255 },
      },
    ]);
    expect(post.requestBody).toEqual({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              tags: { default: [], type: 'array', items: { type: 'string' } },
            },
            required: ['title'],
          },
        },
      },
    });
    expect(Object.keys(post.responses)).toEqual(['201', 'default']);
    expect(post.responses['201']).toEqual({
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
            additionalProperties: false,
          },
        },
      },
    });
    expect(post.security).toEqual([{ session: [] }]);
    expect(post.description).toBeUndefined();
  });

  it('describes an octet-stream body as binary without an idempotency header', () => {
    const upload = defineRoute({
      id: 'files.put_part',
      method: 'PUT',
      path: '/v1/files/:id',
      auth: 'session',
      action: 'media:write',
      params: z.object({ id: z.string() }),
      body: z.instanceof(Uint8Array),
      bodyEncoding: 'octet-stream',
      idempotency: false,
      response: z.object({ bytes: z.number() }),
      summary: 'Put a file part',
    });
    const put = toOpenApi([upload], INFO).paths['/v1/files/{id}']?.put;
    expect(put?.requestBody).toEqual({
      required: true,
      content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
    });
    expect(put?.parameters).toEqual([
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ]);
  });

  it('describes a reviewer GET with two path params in path order', () => {
    const get = op('/v1/review/{token}/posts/{postId}', 'get');
    expect(get.parameters).toEqual([
      { name: 'token', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'postId', in: 'path', required: true, schema: { type: 'string' } },
    ]);
    expect(get.security).toEqual([{ reviewer: [] }]);
    expect(get['x-kronaut-auth']).toEqual(['reviewer']);
  });

  it('puts path, query and header parameters in that order on a DELETE', () => {
    const del = op('/v1/posts/{id}', 'delete');
    expect(del.parameters?.map((p) => `${p.in}:${p.name}`)).toEqual([
      'path:id',
      'header:Idempotency-Key',
    ]);
    expect(del.security).toEqual([{ session: [] }, { grant: [] }, { reviewer: [] }]);
  });

  it('leaves content off a 204 response', () => {
    const del = op('/v1/posts/{id}', 'delete');
    expect(Object.keys(del.responses)).toEqual(['204', 'default']);
    expect(del.responses['204']).toEqual({ description: 'OK' });
  });
});

describe('failures', () => {
  const unrepresentable = defineRoute({
    id: 'posts.bad',
    method: 'POST',
    path: '/v1/bad',
    auth: 'session',
    action: 'posts:draft',
    body: z.object({ when: z.date() }),
    response: z.null(),
    summary: 'Bad',
  });

  it('throws on a zod type JSON Schema cannot represent', () => {
    expect(() => toOpenApi([unrepresentable], INFO)).toThrow(/Date/);
  });

  it('throws on an unrepresentable response', () => {
    const route = defineRoute({
      id: 'posts.bad_response',
      method: 'GET',
      path: '/v1/bad',
      auth: 'session',
      action: 'posts:read',
      response: z.bigint(),
      summary: 'Bad',
    });
    expect(() => toOpenApi([route], INFO)).toThrow();
  });

  it('throws on a schema that would need $defs', () => {
    const named = z.string().meta({ id: 'ContractTestNamed' });
    const route = defineRoute({
      id: 'posts.named',
      method: 'GET',
      path: '/v1/named',
      auth: 'session',
      action: 'posts:read',
      response: z.object({ a: named, b: named }),
      summary: 'Named',
    });
    expect(() => toOpenApi([route], INFO)).toThrow(/\$defs/);
  });

  it('throws on a root-level recursive schema', () => {
    interface Node {
      name: string;
      children: Node[];
    }
    const node: z.ZodType<Node> = z.object({
      name: z.string(),
      get children() {
        return z.array(node);
      },
    });
    const route = defineRoute({
      id: 'posts.tree',
      method: 'GET',
      path: '/v1/tree',
      auth: 'session',
      action: 'posts:read',
      response: node,
      summary: 'Tree',
    });
    expect(() => toOpenApi([route], INFO)).toThrow(/Cycle detected/);
  });

  it('throws when one path shape uses different param names across methods', () => {
    const remove = defineRoute({
      id: 'posts.remove',
      method: 'DELETE',
      path: '/v1/posts/:postId',
      auth: 'session',
      action: 'posts:cancel',
      params: z.object({ postId: z.string() }),
      response: z.null(),
      status: 204,
      summary: 'Remove',
    });
    expect(() => toOpenApi([postGet, remove], INFO)).toThrow(
      /differs only in param names from \/v1\/posts\/:id/,
    );
  });

  it('throws on the same operation twice', () => {
    const twin = defineRoute({
      id: 'health.twin',
      method: 'GET',
      path: '/healthz',
      auth: 'public',
      action: null,
      response: z.null(),
      summary: 'Twin',
    });
    expect(() => toOpenApi([health, twin], INFO)).toThrow(/duplicate operation/);
  });
});

describe('determinism', () => {
  const reference = JSON.stringify(toOpenApi(ALL, INFO));

  it('ignores the order routes are passed in', () => {
    expect(JSON.stringify(toOpenApi([...ALL].reverse(), INFO))).toBe(reference);
    expect(JSON.stringify(toOpenApi([...ALL.slice(2), ...ALL.slice(0, 2)], INFO))).toBe(reference);
  });

  it('ignores the order routes were added to a registry', () => {
    const forward = createRegistry();
    const backward = createRegistry();
    for (const r of ALL) forward.add(r);
    for (const r of [...ALL].reverse()) backward.add(r);
    expect(JSON.stringify(forward.openapi(INFO))).toBe(reference);
    expect(JSON.stringify(backward.openapi(INFO))).toBe(reference);
  });

  it('gives the same result on repeated runs', () => {
    expect(JSON.stringify(toOpenApi(ALL, INFO))).toBe(reference);
  });

  it('does not share mutable state between documents', () => {
    const a = toOpenApi(ALL, INFO);
    const b = toOpenApi(ALL, INFO);
    expect(a.components.schemas).not.toBe(b.components.schemas);
    expect(a.paths).not.toBe(b.paths);
  });
});
