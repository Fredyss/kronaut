import type * as en from '#paraglide/messages/en.js';

type Catalog = typeof en;

const REASONS = {
  ambiguous_response: 'reason_ambiguous_response',
  interrupted_after_send: 'reason_interrupted_after_send',
  verify_inconclusive: 'reason_verify_inconclusive',
  verify_window_elapsed: 'reason_verify_window_elapsed',
  permanent_error: 'reason_permanent_error',
  attempts_exhausted: 'reason_attempts_exhausted',
  late_window_exceeded: 'reason_late_window_exceeded',
  media_processing_timeout: 'reason_media_processing_timeout',
  rate_limit_beyond_deadline: 'reason_rate_limit_beyond_deadline',
  async_give_up: 'reason_async_give_up',
  account_needs_reauth: 'reason_account_needs_reauth',
  account_disconnected: 'reason_account_disconnected',
  account_disabled: 'reason_account_disabled',
  app_credentials_invalid: 'reason_app_credentials_invalid',
  policy_denied: 'reason_policy_denied',
  entitlement_exceeded: 'reason_entitlement_exceeded',
  refresh_token_lost: 'reason_refresh_token_lost',
  restore_quarantine: 'reason_restore_quarantine',
  account_out_of_scope: 'reason_account_out_of_scope',
} as const satisfies Readonly<Record<string, keyof Catalog>>;

const LINES = {
  'destination.failed': 'notification_failed',
  'destination.unconfirmed': 'notification_unconfirmed',
  'destination.awaiting_manual': 'notification_awaiting_manual',
  'channel.needs_reauth': 'notification_needs_reauth',
  'channel.expiring': 'notification_expiring',
  'post.approval_requested': 'notification_approval_requested',
  'post.approved': 'notification_approved',
  'post.rejected': 'notification_rejected',
} as const satisfies Readonly<Record<string, keyof Catalog>>;

const PROVIDERS = {
  bluesky: 'provider_bluesky',
  facebook: 'provider_facebook',
  instagram: 'provider_instagram',
  linkedin: 'provider_linkedin',
  mastodon: 'provider_mastodon',
  threads: 'provider_threads',
} as const satisfies Readonly<Record<string, keyof Catalog>>;

export type ReasonMessages = Pick<
  Catalog,
  (typeof REASONS)[keyof typeof REASONS] | 'reason_generic'
>;
export type LineMessages = Pick<
  Catalog,
  (typeof LINES)[keyof typeof LINES] | 'notification_generic'
>;
export type ProviderMessages = Pick<Catalog, (typeof PROVIDERS)[keyof typeof PROVIDERS]>;

export const NOTIFICATION_KINDS: readonly string[] = Object.keys(LINES);
export const CHANNEL_KINDS: ReadonlySet<string> = new Set([
  'channel.needs_reauth',
  'channel.expiring',
]);

function lookup<T extends object>(table: T, key: string): T[keyof T] | undefined {
  return Object.hasOwn(table, key) ? table[key as keyof T] : undefined;
}

export function reasonLabel(messages: ReasonMessages, code: string): string {
  return messages[lookup(REASONS, code) ?? 'reason_generic']({});
}

export function notificationLine(messages: LineMessages, kind: string, account: string): string {
  const key = lookup(LINES, kind);
  return key === undefined ? messages.notification_generic({}) : messages[key]({ account });
}

export function providerName(messages: ProviderMessages, provider: string): string {
  const key = lookup(PROVIDERS, provider);
  return key === undefined ? provider : messages[key]({});
}
