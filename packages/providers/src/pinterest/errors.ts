import {
  type ProviderError,
  ProviderFailure,
  type ProviderHttpResponse,
  type StepEffect,
} from '@kronaut/core';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { retryAfter } from '../_kit/http.ts';
import { failureForStatus } from '../_kit/status-failure.ts';

const PINNER_DENIED = 'PINNER_DATA_ACCESS_DENIED';
const RESET_FALLBACK_MS = 60_000;
const MAX_RESET_SECONDS = 24 * 60 * 60;

const envelope = z.looseObject({ code: z.number().int().optional() });

export interface FailureContext {
  readonly effect: StepEffect;
  readonly now: Temporal.Instant;
}

function codeOf(text: string): number | undefined {
  try {
    return envelope.safeParse(JSON.parse(text)).data?.code;
  } catch {
    return undefined;
  }
}

function detailOf(status: number, text: string): string {
  const code = codeOf(text);
  return code === undefined ? `http_${status}` : `${status}/${code}`;
}

// The docs name x-ratelimit-reset without a unit; it is read as seconds until the reset.
function resetAt(headers: Headers, now: Temporal.Instant): Temporal.Instant {
  const value = headers.get('x-ratelimit-reset')?.trim() ?? '';
  if (/^\d{1,6}$/.test(value)) {
    return now.add({ seconds: Math.min(Number(value), MAX_RESET_SECONDS) });
  }
  return retryAfter(headers, now, RESET_FALLBACK_MS);
}

function rejection(status: number, text: string, effect: StepEffect): ProviderError | undefined {
  const detail = detailOf(status, text);
  if (status === 403 && text.includes(PINNER_DENIED))
    return { kind: 'permanent', code: 'business_account_required', detail: PINNER_DENIED };
  if (status === 403) return { kind: 'permanent', code: 'forbidden', detail };
  if (status === 404 && effect === 'public')
    return { kind: 'permanent', code: 'board_gone', detail };
  if (status === 400) return { kind: 'permanent', code: 'invalid_request', detail };
  return undefined;
}

export function failureFromBody(
  response: Pick<ProviderHttpResponse, 'status' | 'headers'>,
  text: string,
  { effect, now }: FailureContext,
): ProviderFailure {
  const { status } = response;
  const detail = detailOf(status, text);
  return new ProviderFailure(
    failureForStatus(status, effect, {
      known: () => rejection(status, text, effect),
      rateLimited: () => ({
        kind: 'rate_limited',
        scope: 'account',
        resetAt: resetAt(response.headers, now),
      }),
      unauthorized: () =>
        effect === 'public' ? { kind: 'ambiguous', detail } : { kind: 'auth_expired' },
      serverDetail: detail,
    }),
  );
}

export async function pinterestFailure(
  response: ProviderHttpResponse,
  context: FailureContext,
): Promise<ProviderFailure> {
  let text = '';
  try {
    text = await response.text();
  } catch {
    text = '';
  }
  return failureFromBody(response, text, context);
}

export function isSuccess(status: number): boolean {
  return status >= 200 && status <= 299;
}
