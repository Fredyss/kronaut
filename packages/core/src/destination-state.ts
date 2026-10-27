export const DESTINATION_STATES = [
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
] as const;

export type DestinationState = (typeof DESTINATION_STATES)[number];

export const PUBLISH_DEADLINE_MS = 6 * 3600 * 1000;

export const DESTINATION_TRANSITIONS: Readonly<
  Record<DestinationState, readonly DestinationState[]>
> = {
  draft: ['scheduled', 'canceled'],
  scheduled: ['draft', 'publishing', 'awaiting_manual', 'blocked', 'failed', 'canceled'],
  publishing: [
    'published',
    'retry_wait',
    'verifying',
    'unconfirmed',
    'failed',
    'blocked',
    'canceled',
  ],
  retry_wait: ['draft', 'publishing', 'blocked', 'failed', 'canceled'],
  verifying: ['published', 'retry_wait', 'unconfirmed', 'failed'],
  published: [],
  unconfirmed: ['published', 'scheduled', 'canceled'],
  failed: ['scheduled', 'draft', 'canceled'],
  blocked: ['scheduled', 'draft', 'failed', 'canceled'],
  awaiting_manual: ['published', 'canceled'],
  canceled: ['draft'],
};

export function canTransition(from: DestinationState, to: DestinationState): boolean {
  return DESTINATION_TRANSITIONS[from].includes(to);
}

const REASONS_BY_STATE = {
  draft: ['approval_voided', 'unscheduled', 'rejected'],
  retry_wait: [
    'transient_error',
    'rate_limited',
    'interrupted_safe',
    'provider_processing',
    'absent_verified',
    'auth_refreshed',
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
} as const satisfies Partial<Record<DestinationState, readonly string[]>>;

export type StateReason = (typeof REASONS_BY_STATE)[keyof typeof REASONS_BY_STATE][number];

export const STATE_REASONS: Readonly<Partial<Record<DestinationState, readonly StateReason[]>>> =
  REASONS_BY_STATE;

export function isReasonFor(state: DestinationState, reason: string): boolean {
  const reasons: readonly string[] | undefined = STATE_REASONS[state];
  return reasons?.includes(reason) ?? false;
}
