import type { DestinationState, ProviderError, StateReason } from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import { backoffMs, type RandomInt } from './backoff.ts';
import type { RefreshOutcome } from './refresh.ts';

export const MAX_ATTEMPTS = 6;
const ERROR_MESSAGE_MAX = 2000;

export type AttemptOutcome =
  | 'ok'
  | 'retry_not_sent'
  | 'rate_limited'
  | 'unconfirmed'
  | 'interrupted'
  | 'permanent'
  | 'auth_expired'
  | 'auth_revoked'
  | 'app_config'
  | 'canceled'
  | 'duplicate'
  | 'verify_found'
  | 'verify_absent'
  | 'verify_inconclusive';

export type RunResult =
  | { readonly kind: 'published'; readonly remoteId: string; readonly url?: string }
  | { readonly kind: 'pending'; readonly pollAfterMs: number }
  | {
      readonly kind: 'failure';
      readonly error: ProviderError;
      readonly refresh?: RefreshOutcome;
    }
  | { readonly kind: 'canceled' };

export type AccountIncident = 'auth_revoked' | 'auth_expired' | 'refresh_token_lost';

export type SideEffect =
  | { readonly kind: 'account'; readonly incident: AccountIncident }
  | { readonly kind: 'app'; readonly code: string };

export interface Plan {
  readonly state: DestinationState;
  readonly reason: StateReason | null;
  readonly outcome: AttemptOutcome;
  readonly runAt?: Temporal.Instant;
  readonly remoteId?: string;
  readonly remoteUrl?: string;
  readonly retryAfter?: Temporal.Instant;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly lastError?: { readonly code: string; readonly message: string | null };
  readonly sideEffect?: SideEffect;
  readonly resolution?: 'verified';
}

export interface PlanFacts {
  readonly afterPublic: boolean;
  readonly attemptCount: number;
  readonly deadlineAt: Temporal.Instant;
  readonly now: Temporal.Instant;
  readonly random: RandomInt;
  readonly asyncElapsedMs: number | null;
  readonly asyncGiveUpAfterMs: number | null;
}

export interface RetryTiming {
  readonly retryAfter?: Temporal.Instant | undefined;
  readonly immediate?: boolean;
}

function message(detail: string | undefined): string | undefined {
  return detail === undefined ? undefined : detail.slice(0, ERROR_MESSAGE_MAX);
}

export function errorFields(error: ProviderError): { errorCode: string; errorMessage?: string } {
  const code = error.kind === 'permanent' || error.kind === 'app_config' ? error.code : error.kind;
  const detail = 'detail' in error ? message(error.detail) : undefined;
  return detail === undefined ? { errorCode: code } : { errorCode: code, errorMessage: detail };
}

export function retry(
  reason: StateReason,
  outcome: AttemptOutcome,
  facts: PlanFacts,
  timing: RetryTiming = {},
): Plan {
  const { retryAfter, immediate = false } = timing;
  const after = retryAfter === undefined ? {} : { retryAfter };
  if (facts.attemptCount >= MAX_ATTEMPTS) {
    return { state: 'failed', reason: 'attempts_exhausted', outcome, ...after };
  }
  if (retryAfter !== undefined && Temporal.Instant.compare(retryAfter, facts.deadlineAt) > 0) {
    return { state: 'failed', reason: 'rate_limit_beyond_deadline', outcome, ...after };
  }
  let runAt = immediate
    ? facts.now
    : facts.now.add({ milliseconds: backoffMs(facts.attemptCount, facts.random) });
  if (retryAfter !== undefined && Temporal.Instant.compare(retryAfter, runAt) > 0) {
    runAt = retryAfter;
  }
  if (Temporal.Instant.compare(runAt, facts.deadlineAt) > 0) {
    return { state: 'failed', reason: 'late_window_exceeded', outcome, ...after };
  }
  return { state: 'retry_wait', reason, outcome, runAt, ...after };
}

export function firstCheckAt(
  now: Temporal.Instant,
  random: RandomInt,
  pollAfterMs?: number,
): Temporal.Instant {
  return now.add({ milliseconds: pollAfterMs ?? backoffMs(0, random) });
}

function verifying(
  reason: StateReason,
  outcome: AttemptOutcome,
  facts: PlanFacts,
  pollAfterMs?: number,
): Plan {
  return {
    state: 'verifying',
    reason,
    outcome,
    runAt: firstCheckAt(facts.now, facts.random, pollAfterMs),
  };
}

function unsure(facts: PlanFacts): Plan {
  return facts.afterPublic
    ? verifying('ambiguous_response', 'unconfirmed', facts)
    : retry('interrupted_safe', 'retry_not_sent', facts);
}

export function unconfirmedIfBlocked(planned: Plan): Plan {
  if (planned.state !== 'blocked') return planned;
  return {
    state: 'unconfirmed',
    reason: 'ambiguous_response',
    outcome: planned.outcome,
    ...(planned.sideEffect === undefined ? {} : { sideEffect: planned.sideEffect }),
  };
}

function blocked(planned: Plan, facts: PlanFacts): Plan {
  return facts.afterPublic ? unconfirmedIfBlocked(planned) : planned;
}

function appConfigPlan(outcome: AttemptOutcome, code: string): Plan {
  return {
    state: 'blocked',
    reason: 'app_credentials_invalid',
    outcome,
    sideEffect: { kind: 'app', code },
  };
}

function refreshPlan(refresh: RefreshOutcome, facts: PlanFacts): Plan {
  switch (refresh.kind) {
    case 'refreshed':
      return retry('auth_refreshed', 'auth_expired', facts, { immediate: true });
    case 'rejected':
      return {
        state: 'blocked',
        reason: refresh.lost ? 'refresh_token_lost' : 'account_needs_reauth',
        outcome: 'auth_expired',
        sideEffect: {
          kind: 'account',
          incident: refresh.lost ? 'refresh_token_lost' : 'auth_revoked',
        },
      };
    case 'app':
      return appConfigPlan('auth_expired', refresh.code);
    case 'skipped':
    case 'transient':
      return retry('transient_error', 'auth_expired', facts);
  }
}

function failurePlan(error: ProviderError, facts: PlanFacts): Plan {
  switch (error.kind) {
    case 'transient':
      return retry('transient_error', 'retry_not_sent', facts);
    case 'rate_limited':
      return retry('rate_limited', 'rate_limited', facts, { retryAfter: error.resetAt });
    case 'ambiguous':
      return unsure(facts);
    case 'duplicate':
      return error.remoteId === undefined
        ? verifying('ambiguous_response', 'duplicate', facts)
        : { state: 'published', reason: null, outcome: 'duplicate', remoteId: error.remoteId };
    case 'permanent':
      return {
        state: 'failed',
        reason: 'permanent_error',
        outcome: 'permanent',
        lastError: { code: error.code, message: message(error.detail) ?? null },
      };
    case 'auth_expired':
    case 'auth_revoked':
      return blocked(
        {
          state: 'blocked',
          reason: 'account_needs_reauth',
          outcome: error.kind,
          sideEffect: { kind: 'account', incident: error.kind },
        },
        facts,
      );
    case 'app_config':
      return blocked(appConfigPlan('app_config', error.code), facts);
  }
}

export function plan(result: RunResult, facts: PlanFacts): Plan {
  switch (result.kind) {
    case 'published':
      return {
        state: 'published',
        reason: null,
        outcome: 'ok',
        remoteId: result.remoteId,
        ...(result.url === undefined ? {} : { remoteUrl: result.url }),
      };
    case 'canceled':
      return facts.afterPublic
        ? verifying('ambiguous_response', 'unconfirmed', facts)
        : { state: 'canceled', reason: 'user_canceled', outcome: 'canceled' };
    case 'pending':
      if (facts.afterPublic) {
        return verifying('provider_processing', 'unconfirmed', facts, result.pollAfterMs);
      }
      if (
        facts.asyncGiveUpAfterMs !== null &&
        facts.asyncElapsedMs !== null &&
        facts.asyncElapsedMs > facts.asyncGiveUpAfterMs
      ) {
        return { state: 'failed', reason: 'async_give_up', outcome: 'retry_not_sent' };
      }
      return {
        state: 'retry_wait',
        reason: 'provider_processing',
        outcome: 'retry_not_sent',
        runAt: facts.now.add({ milliseconds: result.pollAfterMs }),
      };
    case 'failure': {
      const planned =
        result.refresh !== undefined && !facts.afterPublic
          ? refreshPlan(result.refresh, facts)
          : failurePlan(result.error, facts);
      return { ...planned, ...errorFields(result.error) };
    }
  }
}
