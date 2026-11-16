import {
  type ProviderError,
  ProviderFailure,
  type ProviderHttpResponse,
  type StepEffect,
} from '@kronaut/core';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { NOT_FOUND } from '../analytics.ts';
import { retryAfter, tryJson } from '../http.ts';
import { failureForStatus } from '../status-failure.ts';

export const DISCORD_API = 'https://discord.com/api/v10';

const UNKNOWN_CHANNEL = 10_003;
const UNKNOWN_MESSAGE = 10_008;
const UNKNOWN_WEBHOOK = 10_015;
const MISSING_ACCESS = 50_001;
const MISSING_PERMISSIONS = 50_013;
const ENTITY_TOO_LARGE = 40_005;
const FORUM_NEEDS_THREAD = 220_001;
const RATE_LIMIT_FALLBACK_MS = 60_000;

export type DiscordAuth = 'webhook' | 'bot';

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

function botError(code: number | undefined, detail: string) {
  if (code === MISSING_PERMISSIONS)
    return { kind: 'permanent', code: 'missing_permissions', detail } as const;
  if (code === MISSING_ACCESS)
    return { kind: 'permanent', code: 'missing_access', detail } as const;
  if (code === UNKNOWN_CHANNEL) return { kind: 'auth_revoked' } as const;
  return undefined;
}

function knownError(status: number, code: number | undefined, detail: string, auth: DiscordAuth) {
  if (code === UNKNOWN_MESSAGE) return NOT_FOUND;
  const bot = auth === 'bot' ? botError(code, detail) : undefined;
  if (bot !== undefined) return bot;
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
  auth: DiscordAuth = 'webhook',
): Promise<ProviderFailure> {
  const body = errorBody.safeParse(await tryJson(response)).data ?? {};
  const { status } = response;
  const detail = body.code === undefined ? `http_${status}` : `${status}/${body.code}`;
  return new ProviderFailure(
    failureForStatus(status, effect, {
      known: () => knownError(status, body.code, detail, auth),
      rateLimited: () => rateLimited(response, body, now),
      unauthorized: () =>
        auth === 'bot'
          ? { kind: 'app_config', code: 'bot_token_invalid' }
          : { kind: 'auth_revoked' },
      clientError: () => ({ kind: 'permanent', code: 'request_rejected', detail }),
      serverDetail: detail,
    }),
  );
}
