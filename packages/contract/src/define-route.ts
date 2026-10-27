import { type Action, isAction } from '@kronaut/core';
import * as z from 'zod';
import { AUTH_MODES, type AuthMode, type HttpMethod } from './auth.ts';

export type ObjectSchema = z.ZodObject<z.core.$ZodLooseShape, z.core.$ZodObjectConfig>;
export type RouteStatus = 200 | 201 | 202 | 204 | 303;
export type RouteAuth = readonly [AuthMode, ...AuthMode[]];

export interface RouteDefinition<
  P extends ObjectSchema | undefined = undefined,
  Q extends ObjectSchema | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  R extends z.ZodType = z.ZodType,
> {
  readonly id: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly auth: AuthMode | readonly AuthMode[];
  readonly action: Action | null;
  readonly params?: P;
  readonly query?: Q;
  readonly body?: B;
  readonly response: R;
  readonly status?: RouteStatus;
  readonly summary: string;
  readonly description?: string;
  readonly tags?: readonly string[];
  readonly idempotency?: boolean;
}

export interface Route<
  P extends ObjectSchema | undefined = ObjectSchema | undefined,
  Q extends ObjectSchema | undefined = ObjectSchema | undefined,
  B extends z.ZodType | undefined = z.ZodType | undefined,
  R extends z.ZodType = z.ZodType,
> {
  readonly id: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly auth: RouteAuth;
  readonly action: Action | null;
  readonly params: P;
  readonly query: Q;
  readonly body: B;
  readonly response: R;
  readonly status: RouteStatus;
  readonly summary: string;
  readonly description?: string;
  readonly tags: readonly string[];
  readonly idempotency: boolean;
}

const ID_PATTERN = /^[a-z][a-z_]*(\.[a-z][a-z_]*)+$/;
const LITERAL_SEGMENT = /^[a-z0-9._-]+$/;
const PARAM_SEGMENT = /^:([a-z][a-zA-Z0-9]*)$/;
const UNVERSIONED_EXACT: readonly string[] = ['/healthz', '/readyz'];
const UNVERSIONED_PREFIXES: readonly string[] = ['/.well-known/', '/oauth/'];
const DEFINED = new WeakSet<object>();

export function isDefinedRoute(route: object): boolean {
  return DEFINED.has(route);
}

export function compareText(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

export function pathSegments(path: string): readonly string[] {
  return path.split('/').slice(1);
}

export function pathParamName(segment: string): string | undefined {
  return PARAM_SEGMENT.exec(segment)?.[1];
}

export function pathParamNames(path: string): readonly string[] {
  return pathSegments(path).flatMap((segment) => pathParamName(segment) ?? []);
}

export function pathShape(path: string): string {
  const segments = pathSegments(path).map((segment) =>
    pathParamName(segment) === undefined ? segment : ':',
  );
  return `/${segments.join('/')}`;
}

function validatePath(path: string, fail: (reason: string) => never): void {
  const allowed =
    path.startsWith('/v1/') ||
    UNVERSIONED_EXACT.includes(path) ||
    UNVERSIONED_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!allowed) {
    fail(`path "${path}" must start with /v1/ or be /healthz, /readyz, /.well-known/ or /oauth/`);
  }
  const seen = new Set<string>();
  for (const segment of pathSegments(path)) {
    const name = pathParamName(segment);
    if (name === undefined) {
      if (segment === '.' || segment === '..') fail(`path "${path}" has dot segment "${segment}"`);
      if (!LITERAL_SEGMENT.test(segment)) fail(`path "${path}" has invalid segment "${segment}"`);
    } else if (seen.has(name)) {
      fail(`path "${path}" repeats param ":${name}"`);
    } else {
      seen.add(name);
    }
  }
}

function validateAuth(
  auth: AuthMode | readonly AuthMode[],
  fail: (reason: string) => never,
): RouteAuth {
  const modes = typeof auth === 'string' ? [auth] : [...auth];
  const [first, ...rest] = modes;
  if (first === undefined) return fail('auth must not be empty');
  for (const mode of modes) {
    if (!AUTH_MODES.includes(mode)) fail(`unknown auth mode "${String(mode)}"`);
  }
  if (new Set(modes).size !== modes.length) fail('auth must not repeat a mode');
  if (modes.includes('public') && modes.length > 1) fail("auth 'public' must stand alone");
  return Object.freeze([first, ...rest]);
}

type SchemaSlots = Pick<
  RouteDefinition<ObjectSchema | undefined, ObjectSchema | undefined>,
  'path' | 'params' | 'query'
>;

function validateSchemas(
  { path, params, query }: SchemaSlots,
  fail: (reason: string) => never,
): void {
  const pathParams = pathParamNames(path);
  if (params !== undefined && !(params instanceof z.ZodObject)) {
    fail('params must be a z.object');
  }
  if (query !== undefined && !(query instanceof z.ZodObject)) {
    fail('query must be a z.object');
  }
  const schemaKeys = params === undefined ? [] : Object.keys(params.shape);
  if (params === undefined && pathParams.length > 0) {
    fail(`params is required for path params ${pathParams.map((n) => `:${n}`).join(', ')}`);
  }
  if (params !== undefined && pathParams.length === 0) {
    fail('params must be omitted when the path has no params');
  }
  if (
    schemaKeys.length !== pathParams.length ||
    !pathParams.every((name) => schemaKeys.includes(name))
  ) {
    fail(
      `params keys [${schemaKeys.join(', ')}] must equal path params [${pathParams.join(', ')}]`,
    );
  }
}

function validateAction(
  action: Action | null,
  isPublic: boolean,
  fail: (reason: string) => never,
): void {
  if (isPublic) {
    if (action !== null) fail('a public route must have action null');
  } else if (action === null || !isAction(action)) {
    fail('a non-public route needs a known action');
  }
}

type MethodSlots = Pick<
  RouteDefinition<undefined, undefined, z.ZodType | undefined>,
  'method' | 'body' | 'idempotency'
>;

function validateMethod(
  { method, body, idempotency }: MethodSlots,
  isPublic: boolean,
  fail: (reason: string) => never,
): void {
  if ((method === 'GET' || method === 'DELETE') && body !== undefined) {
    fail(`${method} must not have a body`);
  }
  if (idempotency === true) {
    if (method === 'GET') fail('GET must not set idempotency');
    if (isPublic) fail('a public route must not set idempotency');
  }
}

export function defineRoute<
  P extends ObjectSchema | undefined = undefined,
  Q extends ObjectSchema | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  R extends z.ZodType = z.ZodType,
>(def: RouteDefinition<P, Q, B, R>): Route<P, Q, B, R> {
  const fail: (reason: string) => never = (reason) => {
    throw new TypeError(`defineRoute(${def.id}): ${reason}`);
  };

  if (!ID_PATTERN.test(def.id)) fail(`id must match ${ID_PATTERN}`);
  validatePath(def.path, fail);
  validateSchemas(def, fail);

  const auth = validateAuth(def.auth, fail);
  const isPublic = auth[0] === 'public';
  validateAction(def.action, isPublic, fail);
  validateMethod(def, isPublic, fail);
  if (def.summary.trim() === '') fail('summary must not be empty');

  const route: Route<P, Q, B, R> = {
    id: def.id,
    method: def.method,
    path: def.path,
    auth,
    action: def.action,
    params: def.params as P,
    query: def.query as Q,
    body: def.body as B,
    response: def.response,
    status: def.status ?? 200,
    summary: def.summary,
    ...(def.description === undefined ? {} : { description: def.description }),
    tags: Object.freeze([...(def.tags ?? [])]),
    idempotency: def.idempotency ?? (def.method !== 'GET' && !isPublic),
  };
  const frozen = Object.freeze(route);
  DEFINED.add(frozen);
  return frozen;
}
