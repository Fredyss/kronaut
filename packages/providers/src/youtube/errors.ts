import {
  type ProviderError,
  ProviderFailure,
  type ProviderHttpResponse,
  type StepEffect,
} from '@kronaut/core';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { failureForStatus } from '../_kit/status-failure.ts';

const PACIFIC = 'America/Los_Angeles';
const REASON = /^[A-Za-z]{1,64}$/;
const REJECTION_STATUSES: ReadonlySet<number> = new Set([400, 401, 403]);
const PERMANENT_REASONS: ReadonlySet<string> = new Set([
  'invalidTitle',
  'invalidDescription',
  'invalidTags',
  'invalidCategoryId',
  'mediaBodyRequired',
  'youtubeSignupRequired',
  'forbidden',
  'forbiddenPrivacySetting',
  'insufficientPermissions',
]);

const envelope = z.looseObject({
  error: z.looseObject({
    errors: z.array(z.looseObject({ reason: z.string().optional() })).optional(),
  }),
});

function nextPacificMidnight(now: Temporal.Instant): Temporal.Instant {
  return now
    .toZonedDateTimeISO(PACIFIC)
    .toPlainDate()
    .add({ days: 1 })
    .toZonedDateTime(PACIFIC)
    .toInstant();
}

function snakeCase(reason: string): string {
  return reason.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function reasonOf(text: string): string | undefined {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return undefined;
  }
  const reason = envelope.safeParse(body).data?.error.errors?.[0]?.reason;
  return reason !== undefined && REASON.test(reason) ? reason : undefined;
}

function rejection(
  status: number,
  reason: string | undefined,
  now: Temporal.Instant,
): ProviderError | undefined {
  if (reason === undefined || !REJECTION_STATUSES.has(status)) return undefined;
  if (status === 403 && reason === 'quotaExceeded')
    return { kind: 'rate_limited', scope: 'app', resetAt: nextPacificMidnight(now) };
  if (status === 400 && reason === 'uploadLimitExceeded')
    return { kind: 'rate_limited', scope: 'account', resetAt: nextPacificMidnight(now) };
  if (PERMANENT_REASONS.has(reason))
    return { kind: 'permanent', code: snakeCase(reason), detail: `${status}/${reason}` };
  return undefined;
}

function failureFromBody(
  status: number,
  text: string,
  context: { readonly effect: StepEffect; readonly now: Temporal.Instant },
): ProviderFailure {
  const { effect, now } = context;
  const reason = reasonOf(text);
  const detail = reason === undefined ? `http_${status}` : `${status}/${reason}`;
  return new ProviderFailure(
    failureForStatus(status, effect, {
      known: () => rejection(status, reason, now),
      rateLimited: () => ({ kind: effect === 'public' ? 'ambiguous' : 'transient', detail }),
      unauthorized: () =>
        effect === 'public' ? { kind: 'ambiguous', detail } : { kind: 'auth_expired' },
      serverDetail: detail,
    }),
  );
}

export async function youtubeFailure(
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
  return failureFromBody(response.status, text, { effect, now });
}

export function isSuccess(status: number): boolean {
  return status >= 200 && status <= 299;
}
