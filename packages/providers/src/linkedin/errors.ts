import {
  type ProviderError,
  ProviderFailure,
  type ProviderHttpResponse,
  type StepEffect,
} from '@kronaut/core';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';

const DUPLICATE = /duplicate/i;
const ERROR_CODE = /^[A-Z][A-Z_]{0,63}$/;
const PERMANENT_STATUS: ReadonlyMap<number, string> = new Map([
  [400, 'invalid_request'],
  [403, 'permission_missing'],
]);

const envelope = z.looseObject({
  status: z.number().optional(),
  serviceErrorCode: z.number().int().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
});
type Envelope = z.infer<typeof envelope>;

export function nextUtcMidnight(now: Temporal.Instant): Temporal.Instant {
  return now
    .toZonedDateTimeISO('UTC')
    .toPlainDate()
    .add({ days: 1 })
    .toZonedDateTime('UTC')
    .toInstant();
}

function detailOf(status: number, body: Envelope | undefined): string {
  const code = body?.code;
  return code !== undefined && ERROR_CODE.test(code) ? `${status}/${code}` : `http_${status}`;
}

function permanent(code: string, detail: string): ProviderError {
  return { kind: 'permanent', code, detail };
}

function rejection(
  status: number,
  body: Envelope | undefined,
  now: Temporal.Instant,
): ProviderError | undefined {
  if (status === 401) return { kind: 'auth_revoked' };
  if (status === 429)
    return { kind: 'rate_limited', scope: 'account', resetAt: nextUtcMidnight(now) };
  const known = PERMANENT_STATUS.get(status);
  if (known !== undefined) return permanent(known, detailOf(status, body));
  if (status !== 422) return undefined;
  return DUPLICATE.test(body?.message ?? '')
    ? { kind: 'duplicate' }
    : permanent('unprocessable', detailOf(status, body));
}

function unexplained(
  status: number,
  body: Envelope | undefined,
  effect: StepEffect,
): ProviderError {
  const detail = detailOf(status, body);
  if (effect === 'public') return { kind: 'ambiguous', detail };
  if (status === 413) return permanent('image_too_large', detail);
  if (status >= 500 || status === 409) return { kind: 'transient', detail };
  return permanent('unexpected_status', detail);
}

function parsedEnvelope(text: string): Envelope | undefined {
  try {
    return envelope.safeParse(JSON.parse(text)).data;
  } catch {
    return undefined;
  }
}

export async function readBody(response: ProviderHttpResponse): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export function failureFromBody(
  status: number,
  text: string,
  context: { readonly effect: StepEffect; readonly now: Temporal.Instant },
): ProviderFailure {
  const body = parsedEnvelope(text);
  return new ProviderFailure(
    rejection(status, body, context.now) ?? unexplained(status, body, context.effect),
  );
}

export async function linkedinFailure(
  response: ProviderHttpResponse,
  effect: StepEffect,
  now: Temporal.Instant,
): Promise<ProviderFailure> {
  return failureFromBody(response.status, await readBody(response), { effect, now });
}

export function isSuccess(status: number): boolean {
  return status >= 200 && status <= 299;
}
