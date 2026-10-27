import type { VerifyMode } from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import { backoffMs, type RandomInt } from './backoff.ts';
import { type AttemptOutcome, type Plan, type PlanFacts, plan, retry } from './plan.ts';
import { instant, type Probed, type VerifyRun } from './verify-run.ts';

const ID_MODES: ReadonlySet<VerifyMode> = new Set([
  'idempotency_key',
  'deterministic_id',
  'status_by_ref',
]);

export interface RecordedAttempt {
  readonly outcome: string | null;
  readonly error_code: string | null;
  readonly error_message: string | null;
  readonly retry_after: Date | null;
  readonly remote_id: string | null;
  readonly remote_url: string | null;
}

export type Settlement =
  | { readonly kind: 'apply'; readonly plan: Plan }
  | { readonly kind: 'recheck'; readonly next: Temporal.Instant };

function recordedPublished(attempt: RecordedAttempt, facts: PlanFacts): Plan | undefined {
  return attempt.remote_id === null
    ? undefined
    : plan(
        {
          kind: 'published',
          remoteId: attempt.remote_id,
          ...(attempt.remote_url === null ? {} : { url: attempt.remote_url }),
        },
        facts,
      );
}

function recordedDuplicate(attempt: RecordedAttempt, facts: PlanFacts): Plan | undefined {
  return attempt.remote_id === null
    ? undefined
    : plan({ kind: 'failure', error: { kind: 'duplicate', remoteId: attempt.remote_id } }, facts);
}

export function recordedPlan(attempt: RecordedAttempt, facts: PlanFacts): Plan | undefined {
  const detail = attempt.error_message === null ? {} : { detail: attempt.error_message };
  switch (attempt.outcome) {
    case 'ok':
      return recordedPublished(attempt, facts);
    case 'duplicate':
      return recordedDuplicate(attempt, facts);
    case 'permanent':
      return plan(
        {
          kind: 'failure',
          error: { kind: 'permanent', code: attempt.error_code ?? 'permanent', ...detail },
        },
        facts,
      );
    case 'auth_expired':
    case 'auth_revoked':
      return plan({ kind: 'failure', error: { kind: attempt.outcome } }, facts);
    case 'app_config':
      return plan(
        {
          kind: 'failure',
          error: { kind: 'app_config', code: attempt.error_code ?? 'app_config', ...detail },
        },
        facts,
      );
    case 'rate_limited':
      return retry('rate_limited', 'rate_limited', facts, {
        retryAfter: attempt.retry_after === null ? undefined : instant(attempt.retry_after),
      });
    case 'retry_not_sent':
      return attempt.error_code === 'transient' || attempt.error_code === 'ambiguous'
        ? plan({ kind: 'failure', error: { kind: attempt.error_code, ...detail } }, facts)
        : undefined;
    default:
      return undefined;
  }
}

export function attemptOutcome(probed: Probed): AttemptOutcome {
  if (probed.kind === 'found') return 'verify_found';
  if (probed.kind === 'absent') return 'verify_absent';
  return 'verify_inconclusive';
}

export function settlement(
  run: VerifyRun,
  probed: Probed,
  now: Temporal.Instant,
  random: RandomInt,
): Settlement {
  if (probed.kind === 'found') {
    return {
      kind: 'apply',
      plan: {
        state: 'published',
        reason: null,
        outcome: 'verify_found',
        remoteId: probed.remoteId,
        ...(probed.url === undefined ? {} : { remoteUrl: probed.url }),
        ...(run.poll ? {} : { resolution: 'verified' as const }),
      },
    };
  }
  if (probed.kind === 'absent' && run.mode !== null && ID_MODES.has(run.mode)) {
    const planned = retry('absent_verified', 'verify_absent', {
      afterPublic: true,
      attemptCount: run.attemptCount,
      deadlineAt: run.deadlineAt,
      now,
      random,
      asyncElapsedMs: null,
      asyncGiveUpAfterMs: null,
    });
    return { kind: 'apply', plan: planned };
  }
  if (Temporal.Instant.compare(now, run.windowEnd) >= 0) {
    return {
      kind: 'apply',
      plan: {
        state: 'unconfirmed',
        reason: 'verify_window_elapsed',
        outcome: attemptOutcome(probed),
      },
    };
  }
  const delayMs = probed.kind === 'pending' ? probed.pollAfterMs : backoffMs(run.checks, random);
  let next = now.add({ milliseconds: delayMs });
  if (Temporal.Instant.compare(next, run.windowEnd) > 0) next = run.windowEnd;
  return { kind: 'recheck', next };
}
