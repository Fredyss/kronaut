import {
  type BaseContext,
  ProviderFailure,
  type ProviderHttpResponse,
  type StepEffect,
} from '@kronaut/core';
import * as z from 'zod';
import { readJson, retryAfter, send, tryJson } from './http.ts';

const RATE_LIMIT_FALLBACK_MS = 60 * 60 * 1000;
export const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);
export const TOKEN_INVALID = 190;
const SUBCODES_REVOKED = new Set([458, 460, 467]);
const SUBCODES_USER_FIXABLE = new Set([459, 464]);

export function permanent(code: string, detail?: string): ProviderFailure {
  return new ProviderFailure({
    kind: 'permanent',
    code,
    ...(detail === undefined ? {} : { detail }),
  });
}

export const longLivedToken = z.looseObject({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
});

const graphError = z.looseObject({
  error: z.looseObject({
    code: z.number().int().optional(),
    error_subcode: z.number().int().optional(),
  }),
});

export function transient(status: number): ProviderFailure {
  return new ProviderFailure({ kind: 'transient', detail: `http_${status}` });
}

export interface GraphErrorCodes {
  readonly code?: number;
  readonly subcode?: number;
}

export function graphErrorCodes(body: unknown): GraphErrorCodes {
  const parsed = graphError.safeParse(body);
  if (!parsed.success) return {};
  const { code, error_subcode: subcode } = parsed.data.error;
  return {
    ...(code === undefined ? {} : { code }),
    ...(subcode === undefined ? {} : { subcode }),
  };
}

export function graphErrorDetail({ code, subcode }: GraphErrorCodes): string | undefined {
  return code === undefined ? undefined : `${code}${subcode === undefined ? '' : `/${subcode}`}`;
}

export function graphFailureFrom(
  ctx: BaseContext,
  response: ProviderHttpResponse,
  codes: GraphErrorCodes,
): ProviderFailure {
  const { code, subcode } = codes;
  if (code === TOKEN_INVALID) {
    if (subcode !== undefined && SUBCODES_REVOKED.has(subcode))
      return new ProviderFailure({ kind: 'auth_revoked' });
    if (subcode !== undefined && SUBCODES_USER_FIXABLE.has(subcode))
      return permanent('user_action_required', `${code}/${subcode}`);
    if (subcode === 492) return permanent('account_role_missing', `${code}/${subcode}`);
    return new ProviderFailure({ kind: 'auth_expired' });
  }
  if (response.status === 429 || (code !== undefined && RATE_LIMIT_CODES.has(code))) {
    return new ProviderFailure({
      kind: 'rate_limited',
      scope: code === 4 ? 'app' : 'account',
      resetAt: retryAfter(response.headers, ctx.now(), RATE_LIMIT_FALLBACK_MS),
    });
  }
  return permanent('graph_error', graphErrorDetail(codes));
}

export async function graphFailure(
  ctx: BaseContext,
  response: ProviderHttpResponse,
): Promise<ProviderFailure> {
  if (response.status >= 500) return transient(response.status);
  return graphFailureFrom(ctx, response, graphErrorCodes(await tryJson(response)));
}

export async function graphGet<T>(
  ctx: BaseContext,
  effect: StepEffect,
  url: URL,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await send(ctx, effect, url, { headers: { accept: 'application/json' } });
  if (response.status !== 200) throw await graphFailure(ctx, response);
  return readJson(response, schema, effect);
}
