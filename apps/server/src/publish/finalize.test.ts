import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { type PlanFacts, plan } from './plan.ts';

const NOW = Temporal.Instant.from('2026-11-02T09:00:00Z');

function facts(afterPublic: boolean): PlanFacts {
  return {
    afterPublic,
    attemptCount: 1,
    deadlineAt: NOW.add({ hours: 1 }),
    now: NOW,
    random: (min) => min,
    asyncElapsedMs: null,
    asyncGiveUpAfterMs: null,
  };
}

describe('plan', () => {
  it('cancels only while nothing was sent', () => {
    expect(plan({ kind: 'canceled' }, facts(false))).toMatchObject({
      state: 'canceled',
      reason: 'user_canceled',
    });
    expect(plan({ kind: 'canceled' }, facts(true))).toMatchObject({
      state: 'verifying',
      reason: 'ambiguous_response',
      outcome: 'unconfirmed',
    });
  });
});
