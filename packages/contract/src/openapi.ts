import * as z from 'zod';
import type { AuthMode } from './auth.ts';
import {
  compareText,
  pathParamName,
  pathParamNames,
  pathSegments,
  pathShape,
  type Route,
} from './define-route.ts';
import { ApiErrorSchema } from './errors.ts';

export interface JsonObject {
  readonly [key: string]: unknown;
}

export interface OpenApiInfo {
  readonly title: string;
  readonly version: string;
}

export interface OpenApiParameter {
  readonly name: string;
  readonly in: 'path' | 'query' | 'header';
  readonly required: boolean;
  readonly schema: JsonObject;
}

type ResponseMediaType = 'application/json' | 'text/plain';
type RequestMediaType =
  | 'application/json'
  | 'application/octet-stream'
  | 'application/x-www-form-urlencoded';

export interface OpenApiResponse {
  readonly description: string;
  readonly content?: Readonly<Partial<Record<ResponseMediaType, { readonly schema: JsonObject }>>>;
}

export interface OpenApiOperation {
  readonly operationId: string;
  readonly summary: string;
  readonly description?: string;
  readonly tags: readonly string[];
  readonly parameters?: readonly OpenApiParameter[];
  readonly requestBody?: {
    readonly required: true;
    readonly content: Readonly<Partial<Record<RequestMediaType, { readonly schema: JsonObject }>>>;
  };
  readonly responses: Readonly<Record<string, OpenApiResponse>>;
  readonly security: readonly Readonly<Record<string, readonly string[]>>[];
  readonly 'x-kronaut-action': string | null;
  readonly 'x-kronaut-auth': readonly AuthMode[];
}

export interface OpenApiSecurityScheme {
  readonly type: 'apiKey' | 'http';
  readonly in?: 'cookie';
  readonly name?: string;
  readonly scheme?: 'bearer';
}

export interface OpenApiDocument {
  readonly openapi: '3.1.0';
  readonly info: OpenApiInfo;
  readonly paths: Readonly<Record<string, Readonly<Record<string, OpenApiOperation>>>>;
  readonly components: {
    readonly schemas: Readonly<Record<string, JsonObject>>;
    readonly securitySchemes: Readonly<Record<AuthModeScheme, OpenApiSecurityScheme>>;
  };
}

type AuthModeScheme = Exclude<AuthMode, 'public'>;

const ERROR_REF = '#/components/schemas/ApiError';

function jsonSchema(routeId: string, schema: z.ZodType, io: 'input' | 'output'): JsonObject {
  const json = z.toJSONSchema(schema, { io, cycles: 'throw' });
  if ('$defs' in json) {
    throw new TypeError(`toOpenApi(${routeId}): schemas that emit $defs are not supported`);
  }
  return Object.fromEntries(Object.entries(json).filter(([key]) => key !== '$schema'));
}

function openApiPath(path: string): string {
  const segments = pathSegments(path).map((segment) => {
    const name = pathParamName(segment);
    return name === undefined ? segment : `{${name}}`;
  });
  return `/${segments.join('/')}`;
}

function parameters(route: Route): readonly OpenApiParameter[] {
  const out: OpenApiParameter[] = [];
  for (const name of pathParamNames(route.path)) {
    const schema: z.ZodType | undefined = route.params?.shape[name];
    if (schema === undefined) {
      throw new TypeError(`toOpenApi(${route.id}): path param ":${name}" has no params schema`);
    }
    out.push({ name, in: 'path', required: true, schema: jsonSchema(route.id, schema, 'input') });
  }
  for (const [name, schema] of Object.entries(route.query?.shape ?? {})) {
    out.push({
      name,
      in: 'query',
      required: !schema.isOptional(),
      schema: jsonSchema(route.id, schema, 'input'),
    });
  }
  if (route.idempotency) {
    out.push({
      name: 'Idempotency-Key',
      in: 'header',
      required: true,
      schema: { type: 'string', minLength: 1, maxLength: 255 },
    });
  }
  return out;
}

const BODY_MEDIA_TYPES = {
  json: 'application/json',
  'octet-stream': 'application/octet-stream',
  form: 'application/x-www-form-urlencoded',
} as const satisfies Readonly<Record<Route['bodyEncoding'], RequestMediaType>>;

function requestBody(route: Route): Pick<OpenApiOperation, 'requestBody'> {
  if (route.body === undefined) return {};
  const schema =
    route.bodyEncoding === 'octet-stream'
      ? { type: 'string', format: 'binary' }
      : jsonSchema(route.id, route.body, 'input');
  const content = { [BODY_MEDIA_TYPES[route.bodyEncoding]]: { schema } };
  return { requestBody: { required: true, content } };
}

function successContent(route: Route): NonNullable<OpenApiResponse['content']> {
  const schema = jsonSchema(route.id, route.response, 'output');
  return route.responseEncoding === 'text'
    ? { 'text/plain': { schema } }
    : { 'application/json': { schema } };
}

function operation(route: Route): OpenApiOperation {
  const params = parameters(route);
  const success: OpenApiResponse =
    route.status === 303
      ? { description: 'See Other' }
      : route.status === 204
        ? { description: 'OK' }
        : { description: 'OK', content: successContent(route) };
  return {
    operationId: route.id,
    summary: route.summary,
    ...(route.description === undefined ? {} : { description: route.description }),
    tags: [...route.tags],
    ...(params.length === 0 ? {} : { parameters: params }),
    ...requestBody(route),
    responses: {
      [String(route.status)]: success,
      default: {
        description: 'Error',
        content: { 'application/json': { schema: { $ref: ERROR_REF } } },
      },
    },
    security: route.auth.includes('public') ? [] : route.auth.map((mode) => ({ [mode]: [] })),
    'x-kronaut-action': route.action,
    'x-kronaut-auth': [...route.auth],
  };
}

export function toOpenApi(routes: readonly Route[], info: OpenApiInfo): OpenApiDocument {
  const entries = routes
    .map((route) => ({
      route,
      path: openApiPath(route.path),
      method: route.method.toLowerCase(),
    }))
    .sort((a, b) => compareText(a.path, b.path) || compareText(a.method, b.method));

  const paths: Record<string, Record<string, OpenApiOperation>> = {};
  const pathByShape = new Map<string, string>();
  for (const { route, path, method } of entries) {
    const shape = pathShape(route.path);
    const known = pathByShape.get(shape);
    if (known !== undefined && known !== route.path) {
      throw new TypeError(
        `toOpenApi(${route.id}): ${route.path} differs only in param names from ${known}`,
      );
    }
    pathByShape.set(shape, route.path);
    const item = paths[path] ?? {};
    if (method in item) {
      throw new TypeError(`toOpenApi(${route.id}): duplicate operation ${method} ${path}`);
    }
    item[method] = operation(route);
    paths[path] = item;
  }

  return {
    openapi: '3.1.0',
    info: { title: info.title, version: info.version },
    paths,
    components: {
      schemas: { ApiError: jsonSchema('ApiError', ApiErrorSchema, 'output') },
      securitySchemes: {
        session: { type: 'apiKey', in: 'cookie', name: '__Host-kronaut_session' },
        grant: { type: 'http', scheme: 'bearer' },
        reviewer: { type: 'apiKey', in: 'cookie', name: '__Host-kronaut_review' },
      },
    },
  };
}
