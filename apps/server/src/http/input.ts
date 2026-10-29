import type { Route } from '@kronaut/contract';
import type * as z from 'zod';
import {
  isFormContentType,
  isJsonContentType,
  isOctetStreamContentType,
  queryObject,
  readBody,
} from './body.ts';
import { HttpError, type IssueDetail } from './errors.ts';
import type { RouteInput } from './types.ts';

export interface RawInput {
  readonly route: Route;
  readonly params: Readonly<Record<string, string>>;
  readonly search: URLSearchParams;
  readonly raw: Uint8Array;
  readonly contentType: string | null;
}

const DECODER = new TextDecoder('utf-8', { fatal: true });

export function issueDetails(source: string, error: z.ZodError): IssueDetail[] {
  return error.issues.map((issue) => ({
    path: [source, ...issue.path.map(String)].join('.'),
    code: issue.code,
  }));
}

function parseJson(raw: Uint8Array, contentType: string | null): unknown {
  if (raw.byteLength === 0) return undefined;
  if (!isJsonContentType(contentType)) {
    throw new HttpError('unsupported_media_type', 'The request body must be application/json.');
  }
  try {
    return JSON.parse(DECODER.decode(raw));
  } catch {
    throw new HttpError('invalid_request', 'The request body is not valid JSON.');
  }
}

function parseForm(raw: Uint8Array, contentType: string | null): unknown {
  if (!isFormContentType(contentType)) {
    throw new HttpError(
      'unsupported_media_type',
      'The request body must be application/x-www-form-urlencoded.',
    );
  }
  try {
    return queryObject(new URLSearchParams(DECODER.decode(raw)));
  } catch {
    throw new HttpError('invalid_request', 'The request body is not valid UTF-8.');
  }
}

function rawBody(route: Route, raw: Uint8Array, contentType: string | null): unknown {
  if (route.bodyEncoding === 'json') return parseJson(raw, contentType);
  if (route.bodyEncoding === 'form') return parseForm(raw, contentType);
  if (!isOctetStreamContentType(contentType)) {
    throw new HttpError(
      'unsupported_media_type',
      'The request body must be application/octet-stream.',
    );
  }
  return raw;
}

export async function readLimited(request: Request, limit: number): Promise<Uint8Array> {
  const raw = await readBody(request, limit);
  if (raw === null) throw new HttpError('payload_too_large', 'The request body is too large.');
  return raw;
}

export function parseInput(request: RawInput): RouteInput<Route> {
  const { route, params, search, raw, contentType } = request;
  const details: IssueDetail[] = [];
  const parse = (source: string, schema: z.ZodType | undefined, value: unknown): unknown => {
    if (schema === undefined) return undefined;
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    details.push(...issueDetails(source, result.error));
    return undefined;
  };
  const input = {
    params: parse('params', route.params, params),
    query: parse('query', route.query, queryObject(search)),
    body:
      route.body === undefined
        ? undefined
        : parse('body', route.body, rawBody(route, raw, contentType)),
  };
  if (details.length > 0) {
    throw new HttpError('invalid_request', 'The request is invalid.', { details });
  }
  return input as RouteInput<Route>;
}
