import {
  type BaseContext,
  type ProviderError,
  ProviderFailure,
  type ProviderHttpRequest,
  type ProviderHttpResponse,
  type RateLimitScope,
  type StepEffect,
} from '@kronaut/core';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { readJson, send, tryJson } from '../_kit/http.ts';
import { type GraphErrorCodes, graphErrorCodes, graphErrorDetail } from '../_kit/meta-graph.ts';

const RATE_LIMIT_FALLBACK = { hours: 1 };
const BUC_HEADER = 'x-business-use-case-usage';
const RATE_LIMIT_SCOPES: ReadonlyMap<number, RateLimitScope> = new Map([
  [4, 'app'],
  [17, 'app'],
  [341, 'app'],
  [613, 'app'],
  [32, 'account'],
  [80001, 'account'],
]);
const PERMANENT_CODES: ReadonlyMap<number, string> = new Map([
  [10, 'permission_missing'],
  [283, 'permission_missing'],
  [368, 'policy_blocked'],
  [100, 'invalid_parameter'],
  [324, 'invalid_image'],
  [1609005, 'link_error'],
]);
const TRANSIENT_CODES = new Set([1, 2]);
const TOKEN_INVALID = 190;
const SUBCODES_EXPIRED = new Set([463, 467]);
const NO_PAGE_TASK = '1/2853006';

const errorType = z.looseObject({ error: z.looseObject({ type: z.string().optional() }) });
const usage = z.record(
  z.string(),
  z.array(z.looseObject({ estimated_time_to_regain_access: z.number().optional() })),
);

function regainMinutes(headers: Headers): number | undefined {
  const raw = headers.get(BUC_HEADER);
  if (raw === null) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const entries = usage.safeParse(parsed).data;
  if (entries === undefined) return undefined;
  const minutes = Object.values(entries)
    .flat()
    .map((entry) => entry.estimated_time_to_regain_access ?? 0);
  const longest = Math.max(0, ...minutes);
  return Number.isSafeInteger(longest) && longest > 0 ? longest : undefined;
}

function resetAt(ctx: BaseContext, headers: Headers): Temporal.Instant {
  const minutes = regainMinutes(headers);
  return ctx.now().add(minutes === undefined ? RATE_LIMIT_FALLBACK : { minutes });
}

function authError(codes: GraphErrorCodes, body: unknown): ProviderError | undefined {
  const { code, subcode } = codes;
  if (code === TOKEN_INVALID)
    return {
      kind:
        subcode !== undefined && SUBCODES_EXPIRED.has(subcode) ? 'auth_expired' : 'auth_revoked',
    };
  if (code === 102 || graphErrorDetail(codes) === NO_PAGE_TASK) return { kind: 'auth_revoked' };
  if (code === undefined && errorType.safeParse(body).data?.error.type === 'OAuthException')
    return { kind: 'auth_revoked' };
  return undefined;
}

function knownError(
  ctx: BaseContext,
  response: ProviderHttpResponse,
  codes: GraphErrorCodes,
  body: unknown,
): ProviderError | undefined {
  const auth = authError(codes, body);
  if (auth !== undefined) return auth;
  const { code } = codes;
  const scope = code === undefined ? undefined : RATE_LIMIT_SCOPES.get(code);
  if (scope !== undefined || (code === undefined && response.status === 429))
    return {
      kind: 'rate_limited',
      scope: scope ?? 'account',
      resetAt: resetAt(ctx, response.headers),
    };
  if (code === undefined) return undefined;
  if (code === 506) return { kind: 'duplicate' };
  const detail = graphErrorDetail(codes);
  const permanent = code >= 200 && code <= 299 ? 'permission_missing' : PERMANENT_CODES.get(code);
  return permanent === undefined
    ? undefined
    : { kind: 'permanent', code: permanent, ...(detail === undefined ? {} : { detail }) };
}

export async function graphFailure(
  ctx: BaseContext,
  response: ProviderHttpResponse,
  effect: StepEffect,
): Promise<ProviderFailure> {
  const isPublic = effect === 'public';
  if (response.status >= 500)
    return new ProviderFailure({
      kind: isPublic ? 'ambiguous' : 'transient',
      detail: `http_${response.status}`,
    });
  const body = await tryJson(response);
  const codes = graphErrorCodes(body);
  const known = knownError(ctx, response, codes, body);
  if (known !== undefined) return new ProviderFailure(known);
  const detail = graphErrorDetail(codes) ?? `http_${response.status}`;
  if (isPublic) return new ProviderFailure({ kind: 'ambiguous', detail });
  if (codes.code !== undefined && TRANSIENT_CODES.has(codes.code))
    return new ProviderFailure({ kind: 'transient', detail });
  return new ProviderFailure({ kind: 'permanent', code: 'graph_error', detail });
}

export async function graphCall<T>(
  ctx: BaseContext,
  effect: StepEffect,
  request: { readonly url: URL; readonly init?: ProviderHttpRequest },
  schema: z.ZodType<T>,
): Promise<T> {
  const { url, init = {} } = request;
  const headers = { accept: 'application/json', ...init.headers };
  const response = await send(ctx, effect, url, { ...init, headers });
  if (response.status !== 200) throw await graphFailure(ctx, response, effect);
  return readJson(response, schema, effect);
}
