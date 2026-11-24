import {
  type ProviderError,
  ProviderFailure,
  type ProviderHttpResponse,
  type StepEffect,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { retryAfter } from '../_kit/http.ts';
import { failureForStatus } from '../_kit/status-failure.ts';

const RESET_FALLBACK_MS = 15 * 60 * 1000;
const MAX_RESET_MS = 24 * 60 * 60 * 1000;
const PROBLEM_TYPE = /^https:\/\/api\.(?:x|twitter)\.com\/2\/problems\/([a-z-]{1,64})$/;
const MENTIONS_CREDITS = /\bcredits?\b/i;
const USAGE_CAPPED = 'usage-capped';

const problem = z.looseObject({ type: z.string().optional() });

function problemType(text: string): string | undefined {
  try {
    const type = problem.safeParse(JSON.parse(text)).data?.type ?? '';
    return PROBLEM_TYPE.exec(type)?.[1];
  } catch {
    return undefined;
  }
}

function detailOf(status: number, text: string): string {
  const type = problemType(text);
  return type === undefined ? `http_${status}` : `${status}/${type}`;
}

function resetAt(headers: Headers, now: Temporal.Instant): Temporal.Instant {
  const value = headers.get('x-rate-limit-reset')?.trim() ?? '';
  if (/^\d{1,12}$/.test(value)) {
    const at = Temporal.Instant.fromEpochMilliseconds(Number(value) * 1000);
    const latest = now.add({ milliseconds: MAX_RESET_MS });
    if (Temporal.Instant.compare(at, now) <= 0) return retryAfter(headers, now, RESET_FALLBACK_MS);
    return Temporal.Instant.compare(at, latest) > 0 ? latest : at;
  }
  return retryAfter(headers, now, RESET_FALLBACK_MS);
}

export function creditsDepleted(status: number, text: string): boolean {
  return status === 402 || (status === 403 && MENTIONS_CREDITS.test(text));
}

function rejection(status: number, text: string): ProviderError | undefined {
  const detail = detailOf(status, text);
  if (creditsDepleted(status, text)) return { kind: 'permanent', code: 'credits_depleted', detail };
  if (status === 403) return { kind: 'permanent', code: 'forbidden', detail };
  if (status === 400) return { kind: 'permanent', code: 'invalid_request', detail };
  if (status === 404) return { kind: 'permanent', code: 'not_found', detail };
  return undefined;
}

export function failureFromBody(
  response: Pick<ProviderHttpResponse, 'status' | 'headers'>,
  text: string,
  effect: StepEffect,
  now: Temporal.Instant,
): ProviderFailure {
  const { status } = response;
  const detail = detailOf(status, text);
  return new ProviderFailure(
    failureForStatus(status, effect, {
      known: () => rejection(status, text),
      rateLimited: () => ({
        kind: 'rate_limited',
        scope: problemType(text) === USAGE_CAPPED ? 'app' : 'account',
        resetAt: resetAt(response.headers, now),
      }),
      unauthorized: () =>
        effect === 'public' ? { kind: 'ambiguous', detail } : { kind: 'auth_expired' },
      serverDetail: detail,
    }),
  );
}

export async function xFailure(
  response: ProviderHttpResponse,
  effect: StepEffect,
  now: Temporal.Instant,
): Promise<ProviderFailure> {
  let text = '';
  try {
    text = await response.text();
  } catch {
    text = '';
  }
  return failureFromBody(response, text, effect, now);
}

export function isSuccess(status: number): boolean {
  return status >= 200 && status <= 299;
}
