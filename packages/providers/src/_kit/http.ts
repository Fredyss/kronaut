import type {
  BaseContext,
  ProviderHttpRequest,
  ProviderHttpResponse,
  StepEffect,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import type * as z from 'zod';
import { toProviderFailure, unexpectedResponse } from './failure.ts';

export async function send(
  ctx: BaseContext,
  effect: StepEffect,
  url: string | URL,
  init: ProviderHttpRequest = {},
): Promise<ProviderHttpResponse> {
  try {
    const signal =
      init.signal === undefined ? ctx.signal : AbortSignal.any([ctx.signal, init.signal]);
    return await ctx.http.request(url, { ...init, signal });
  } catch (error) {
    throw toProviderFailure(error, effect);
  }
}

export async function readJson<T>(
  response: ProviderHttpResponse,
  schema: z.ZodType<T>,
  effect: StepEffect,
): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) throw unexpectedResponse(effect, error);
    throw toProviderFailure(error, effect);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw unexpectedResponse(effect, parsed.error);
  return parsed.data;
}

export async function tryJson(response: ProviderHttpResponse): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export function retryAfter(
  headers: Headers,
  now: Temporal.Instant,
  fallbackMs: number,
): Temporal.Instant {
  const value = headers.get('retry-after')?.trim();
  try {
    if (value !== undefined && /^\d+$/.test(value)) return now.add({ seconds: Number(value) });
    if (value !== undefined && value !== '') {
      const at = Date.parse(value);
      if (!Number.isNaN(at)) {
        const instant = Temporal.Instant.fromEpochMilliseconds(at);
        return Temporal.Instant.compare(instant, now) > 0 ? instant : now;
      }
    }
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
  }
  return now.add({ milliseconds: fallbackMs });
}
