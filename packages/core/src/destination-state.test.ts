import { describe, expect, it } from 'vitest';
import {
  canTransition,
  DESTINATION_STATES,
  DESTINATION_TRANSITIONS,
  type DestinationState,
  isReasonFor,
  STATE_REASONS,
} from './destination-state.ts';

const EXPECTED_TRANSITIONS: readonly (readonly [DestinationState, DestinationState])[] = [
  ['draft', 'scheduled'],
  ['draft', 'canceled'],
  ['scheduled', 'draft'],
  ['scheduled', 'publishing'],
  ['scheduled', 'awaiting_manual'],
  ['scheduled', 'blocked'],
  ['scheduled', 'failed'],
  ['scheduled', 'canceled'],
  ['retry_wait', 'draft'],
  ['retry_wait', 'publishing'],
  ['retry_wait', 'blocked'],
  ['retry_wait', 'failed'],
  ['retry_wait', 'canceled'],
  ['publishing', 'published'],
  ['publishing', 'retry_wait'],
  ['publishing', 'verifying'],
  ['publishing', 'unconfirmed'],
  ['publishing', 'failed'],
  ['publishing', 'blocked'],
  ['publishing', 'canceled'],
  ['verifying', 'published'],
  ['verifying', 'retry_wait'],
  ['verifying', 'unconfirmed'],
  ['verifying', 'failed'],
  ['unconfirmed', 'published'],
  ['unconfirmed', 'scheduled'],
  ['unconfirmed', 'canceled'],
  ['blocked', 'scheduled'],
  ['blocked', 'draft'],
  ['blocked', 'failed'],
  ['blocked', 'canceled'],
  ['failed', 'scheduled'],
  ['failed', 'draft'],
  ['failed', 'canceled'],
  ['awaiting_manual', 'published'],
  ['awaiting_manual', 'canceled'],
  ['canceled', 'draft'],
];

const EXPECTED_REASONS: Readonly<Partial<Record<DestinationState, readonly string[]>>> = {
  draft: ['approval_voided', 'unscheduled', 'rejected'],
  retry_wait: [
    'transient_error',
    'rate_limited',
    'interrupted_safe',
    'provider_processing',
    'absent_verified',
    'auth_refreshed',
    'chain_next',
  ],
  verifying: [
    'ambiguous_response',
    'interrupted_after_send',
    'provider_processing',
    'late_finalize',
  ],
  unconfirmed: [
    'ambiguous_response',
    'interrupted_after_send',
    'verify_inconclusive',
    'verify_window_elapsed',
  ],
  failed: [
    'permanent_error',
    'attempts_exhausted',
    'late_window_exceeded',
    'media_processing_timeout',
    'rate_limit_beyond_deadline',
    'async_give_up',
    'thread_incomplete',
  ],
  blocked: [
    'account_needs_reauth',
    'account_disconnected',
    'account_disabled',
    'app_credentials_invalid',
    'policy_denied',
    'entitlement_exceeded',
    'refresh_token_lost',
    'restore_quarantine',
    'account_out_of_scope',
  ],
  canceled: ['user_canceled', 'workspace_deleted', 'account_purged', 'skipped_manual'],
};

const STATES_WITHOUT_REASONS: readonly DestinationState[] = [
  'scheduled',
  'publishing',
  'published',
  'awaiting_manual',
];

function allPairs(): [DestinationState, DestinationState][] {
  return DESTINATION_STATES.flatMap((from) =>
    DESTINATION_STATES.map((to): [DestinationState, DestinationState] => [from, to]),
  );
}

describe('DESTINATION_STATES', () => {
  it('lists the 11 states in pipeline order', () => {
    expect(DESTINATION_STATES).toEqual([
      'draft',
      'scheduled',
      'publishing',
      'retry_wait',
      'verifying',
      'published',
      'unconfirmed',
      'failed',
      'blocked',
      'awaiting_manual',
      'canceled',
    ]);
  });
});

describe('DESTINATION_TRANSITIONS', () => {
  const pairs = Object.entries(DESTINATION_TRANSITIONS).flatMap(([from, targets]) =>
    targets.map((to) => `${from}>${to}`),
  );

  it('has an entry for every state and nothing else', () => {
    expect(Object.keys(DESTINATION_TRANSITIONS).sort()).toEqual([...DESTINATION_STATES].sort());
  });

  it('has exactly 37 pairs', () => {
    expect(pairs).toHaveLength(37);
    expect(new Set(pairs).size).toBe(37);
  });

  it('matches the pipeline table pair for pair', () => {
    expect(new Set(pairs)).toEqual(new Set(EXPECTED_TRANSITIONS.map(([f, t]) => `${f}>${t}`)));
  });

  it('only targets known states and never loops', () => {
    for (const [from, targets] of Object.entries(DESTINATION_TRANSITIONS)) {
      for (const to of targets) {
        expect(DESTINATION_STATES).toContain(to);
        expect(to).not.toBe(from);
      }
    }
  });

  it('gives published no outgoing transitions', () => {
    expect(DESTINATION_TRANSITIONS.published).toEqual([]);
  });

  it('never moves unconfirmed back to publishing', () => {
    expect(DESTINATION_TRANSITIONS.unconfirmed).not.toContain('publishing');
    expect(canTransition('unconfirmed', 'publishing')).toBe(false);
  });

  it('never moves verifying back to publishing', () => {
    expect(canTransition('verifying', 'publishing')).toBe(false);
  });

  it('reaches publishing only by claim from scheduled or retry_wait', () => {
    const into = DESTINATION_STATES.filter((from) => canTransition(from, 'publishing'));
    expect(into).toEqual(['scheduled', 'retry_wait']);
  });
});

describe('canTransition', () => {
  const allowed = new Set(EXPECTED_TRANSITIONS.map(([f, t]) => `${f}>${t}`));

  it.each(allPairs())('%s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(allowed.has(`${from}>${to}`));
  });

  it('allows exactly 37 of the 121 pairs', () => {
    expect(allPairs().filter(([from, to]) => canTransition(from, to))).toHaveLength(37);
  });
});

describe('STATE_REASONS', () => {
  it('has reasons only for the seven states that carry them', () => {
    expect(Object.keys(STATE_REASONS).sort()).toEqual(Object.keys(EXPECTED_REASONS).sort());
  });

  it.each(Object.entries(EXPECTED_REASONS))('matches the table for %s', (state, reasons) => {
    expect(STATE_REASONS[state as DestinationState]).toEqual(reasons);
  });

  it('has 38 reasons in total', () => {
    const total = Object.values(STATE_REASONS).reduce((sum, reasons) => sum + reasons.length, 0);
    expect(total).toBe(38);
  });

  it('has unique, snake_case reasons within each state', () => {
    for (const reasons of Object.values(STATE_REASONS)) {
      expect(new Set(reasons).size).toBe(reasons.length);
      for (const reason of reasons) {
        expect(reason).toMatch(/^[a-z_]+$/);
      }
    }
  });

  it.each(STATES_WITHOUT_REASONS)('has no reasons for %s', (state) => {
    expect(STATE_REASONS[state]).toBeUndefined();
  });
});

describe('isReasonFor', () => {
  it('accepts every listed reason for its state', () => {
    for (const [state, reasons] of Object.entries(EXPECTED_REASONS)) {
      for (const reason of reasons) {
        expect(isReasonFor(state as DestinationState, reason)).toBe(true);
      }
    }
  });

  it('rejects every listed reason for a state that does not list it', () => {
    for (const state of DESTINATION_STATES) {
      const own = EXPECTED_REASONS[state] ?? [];
      const others = Object.values(EXPECTED_REASONS)
        .flat()
        .filter((reason) => !own.includes(reason));
      for (const reason of others) {
        expect(isReasonFor(state, reason)).toBe(false);
      }
    }
  });

  it.each(STATES_WITHOUT_REASONS)('rejects everything for %s', (state) => {
    expect(isReasonFor(state, 'user_canceled')).toBe(false);
    expect(isReasonFor(state, '')).toBe(false);
  });

  it('shares provider_processing between retry_wait and verifying only', () => {
    const states = DESTINATION_STATES.filter((s) => isReasonFor(s, 'provider_processing'));
    expect(states).toEqual(['retry_wait', 'verifying']);
  });

  it('shares ambiguous_response between verifying and unconfirmed only', () => {
    const states = DESTINATION_STATES.filter((s) => isReasonFor(s, 'ambiguous_response'));
    expect(states).toEqual(['verifying', 'unconfirmed']);
  });

  it('rejects unknown, empty and differently cased reasons', () => {
    expect(isReasonFor('draft', 'nope')).toBe(false);
    expect(isReasonFor('draft', '')).toBe(false);
    expect(isReasonFor('draft', 'Rejected')).toBe(false);
    expect(isReasonFor('draft', 'rejected ')).toBe(false);
  });
});
