import {
  type ProviderError,
  ProviderFailure,
  type ProviderHttpResponse,
  type StepEffect,
} from '@kronaut/core';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { retryAfter, tryJson } from '../http.ts';
import { failureForStatus } from '../status-failure.ts';

export const DISCORD_API = 'https://discord.com/api/v10';

const UNKNOWN_WEBHOOK = 10_015;
const ENTITY_TOO_LARGE = 40_005;
const FORUM_NEEDS_THREAD = 220_001;
const RATE_LIMIT_FALLBACK_MS = 60_000;

export const snowflake = z.string().regex(/^\d{1,20}$/);

const errorBody = z.looseObject({
  code: z.number().int().optional(),
  retry_after: z.number().nonnegative().optional(),
  global: z.boolean().optional(),
});
type ErrorBody = z.infer<typeof errorBody>;

export function isSuccess(status: number): boolean {
  return status >= 200 && status <= 299;
}

export function channelUrl(guildId: string, channelId: string): string {
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

export function messageUrl(guildId: string, channelId: string, messageId: string): string {
  return `${channelUrl(guildId, channelId)}/${messageId}`;
}

function knownError(status: number, code: number | undefined, detail: string) {
  if (status === 404 || code === UNKNOWN_WEBHOOK) return { kind: 'auth_revoked' } as const;
  if (status === 413 || code === ENTITY_TOO_LARGE)
    return { kind: 'permanent', code: 'too_large', detail } as const;
  if (status === 400 && code === FORUM_NEEDS_THREAD)
    return { kind: 'permanent', code: 'forum_channel_unsupported', detail } as const;
  return undefined;
}

function rateLimited(
  response: ProviderHttpResponse,
  body: ErrorBody,
  now: Temporal.Instant,
): ProviderError {
  const global = body.global === true || response.headers.get('x-ratelimit-scope') === 'global';
  const resetAt =
    body.retry_after === undefined
      ? retryAfter(response.headers, now, RATE_LIMIT_FALLBACK_MS)
      : now.add({ milliseconds: Math.ceil(body.retry_after * 1000) });
  return { kind: 'rate_limited', scope: global ? 'app' : 'account', resetAt };
}

export async function discordFailure(
  response: ProviderHttpResponse,
  effect: StepEffect,
  now: Temporal.Instant,
): Promise<ProviderFailure> {
  const body = errorBody.safeParse(await tryJson(response)).data ?? {};
  const { status } = response;
  const detail = body.code === undefined ? `http_${status}` : `${status}/${body.code}`;
  return new ProviderFailure(
    failureForStatus(status, effect, {
      known: () => knownError(status, body.code, detail),
      rateLimited: () => rateLimited(response, body, now),
      unauthorized: () => ({ kind: 'auth_revoked' }),
      clientError: () => ({ kind: 'permanent', code: 'request_rejected', detail }),
      serverDetail: detail,
    }),
  );
}
