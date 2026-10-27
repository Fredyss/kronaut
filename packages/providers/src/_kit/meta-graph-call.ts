import {
  type ProviderError,
  ProviderFailure,
  type ProviderHttpResponse,
  type PublishContext,
  type StepEffect,
} from '@kronaut/core';
import type * as z from 'zod';
import { readJson, send, tryJson } from './http.ts';
import { dropContainer, type MetaInput, type State } from './meta-container-state.ts';
import {
  type GraphErrorCodes,
  graphErrorCodes,
  graphErrorDetail,
  graphFailureFrom,
  RATE_LIMIT_CODES,
  TOKEN_INVALID,
} from './meta-graph.ts';

export class NotReady extends Error {
  override readonly name = 'NotReady';
}

export interface GraphFailure {
  readonly error: ProviderError;
  readonly recreate: boolean;
}

export function fail(error: ProviderError, recreate = false): GraphFailure {
  return { error, recreate };
}

export interface ErrorFacts {
  readonly body: unknown;
  readonly codes: GraphErrorCodes;
  readonly isPublic: boolean;
  readonly withDetail: { readonly detail?: string };
}

export type ClassifyError = (
  ctx: PublishContext,
  facts: ErrorFacts,
) => GraphFailure | NotReady | undefined;

export async function graphRequestFailure(
  ctx: PublishContext,
  response: ProviderHttpResponse,
  effect: StepEffect,
  classify?: ClassifyError,
): Promise<GraphFailure | NotReady> {
  const isPublic = effect === 'public';
  if (response.status >= 500)
    return fail({ kind: isPublic ? 'ambiguous' : 'transient', detail: `http_${response.status}` });
  const body = await tryJson(response);
  const codes = graphErrorCodes(body);
  const { code } = codes;
  if (isPublic && code === undefined && response.status !== 429)
    return fail({ kind: 'ambiguous', detail: `http_${response.status}` });
  const detail = graphErrorDetail(codes);
  const withDetail = detail === undefined ? {} : { detail };
  const classified = classify?.(ctx, { body, codes, isPublic, withDetail });
  if (classified !== undefined) return classified;
  const definitive =
    response.status === 429 ||
    code === TOKEN_INVALID ||
    (code !== undefined && RATE_LIMIT_CODES.has(code));
  if (isPublic && !definitive) return fail({ kind: 'ambiguous', ...withDetail });
  return fail(graphFailureFrom(ctx, response, codes).error);
}

export interface GraphApi {
  readonly origin: string;
  readonly version: string;
  readonly classify?: ClassifyError;
}

export interface GraphCall<T> {
  readonly effect: StepEffect;
  readonly url: URL;
  readonly schema: z.ZodType<T>;
  readonly form?: Readonly<Record<string, string>>;
  readonly state?: State | undefined;
}

export interface MetaGraph {
  versioned(path: string, input: MetaInput, query?: Readonly<Record<string, string>>): URL;
  call<T>(ctx: PublishContext, request: GraphCall<T>): Promise<T>;
}

export function metaGraph(api: GraphApi): MetaGraph {
  return {
    versioned(path, input, query = {}) {
      const url = new URL(`/${api.version}/${path}`, api.origin);
      const params = { ...query, access_token: input.credentials.accessToken };
      for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
      return url;
    },
    async call(ctx, { effect, url, schema, form, state }) {
      const response = await send(ctx, effect, url, {
        headers: {
          accept: 'application/json',
          ...(form === undefined ? {} : { 'content-type': 'application/x-www-form-urlencoded' }),
        },
        ...(form === undefined
          ? {}
          : { method: 'POST', body: new URLSearchParams(form).toString() }),
      });
      if (response.status === 200) return readJson(response, schema, effect);
      const failure = await graphRequestFailure(ctx, response, effect, api.classify);
      if (failure instanceof NotReady) throw failure;
      if (failure.recreate && state !== undefined) await dropContainer(ctx, state);
      throw new ProviderFailure(failure.error);
    },
  };
}
