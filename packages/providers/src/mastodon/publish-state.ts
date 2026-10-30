import { createHash } from 'node:crypto';
import {
  type BaseContext,
  ProviderFailure,
  type ProviderHttpResponse,
  type PublishContext,
  type PublishInput,
  type StepEffect,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { retryAfter } from '../_kit/http.ts';
import { failureForStatus } from '../_kit/status-failure.ts';
import { originOf, permanent } from './api.ts';
import type { MastodonCredentials } from './connect.ts';
import type { MastodonSettings } from './manifest.ts';

export type Input = PublishInput<MastodonCredentials, MastodonSettings>;

const RATE_LIMIT_FALLBACK_MS = 5 * 60 * 1000;

export const remoteId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

const uploaded = z.object({ id: remoteId, ready: z.boolean() });

export const publishState = z.object({
  media: z.record(z.string(), uploaded).optional(),
  sentAt: z.iso.datetime().optional(),
  status: z.object({ id: remoteId, url: z.string().optional() }).optional(),
});
export type State = z.infer<typeof publishState>;

export function parseState(state: unknown): State {
  const parsed = publishState.safeParse(state);
  if (!parsed.success) throw permanent('state_invalid');
  return parsed.data;
}

export async function save(ctx: PublishContext, state: State): Promise<State> {
  await ctx.checkpoint(state);
  return state;
}

export function idempotencyKey(destinationId: string, position: number): string {
  return createHash('sha256').update(`${destinationId}:${position}`).digest('base64url');
}

export function endpoint(input: Input, path: string): URL {
  return new URL(path, originOf(input.app));
}

export function authorized(input: Input): Record<string, string> {
  return { accept: 'application/json', authorization: `Bearer ${input.credentials.accessToken}` };
}

function resetAt(headers: Headers, now: Temporal.Instant): Temporal.Instant {
  const reset = headers.get('x-ratelimit-reset')?.trim();
  if (reset !== undefined && reset !== '') {
    try {
      return Temporal.Instant.from(reset);
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
    }
  }
  return retryAfter(headers, now, RATE_LIMIT_FALLBACK_MS);
}

export function failureOf(
  ctx: BaseContext,
  response: ProviderHttpResponse,
  effect: StepEffect,
  invalid: string,
): ProviderFailure {
  const { status, headers } = response;
  return new ProviderFailure(
    failureForStatus(status, effect, {
      rateLimited: () => ({
        kind: 'rate_limited',
        scope: 'account',
        resetAt: resetAt(headers, ctx.now()),
      }),
      known: () => (status === 422 ? { kind: 'permanent', code: invalid } : undefined),
      unauthorized: () => ({ kind: 'auth_revoked' }),
      clientError: () => ({ kind: 'permanent', code: `http_${status}` }),
    }),
  );
}
