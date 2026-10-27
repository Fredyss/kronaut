export const WEBHOOK_API_VERSION = '2026-10-01';

export const WEBHOOK_EVENT_TYPES = [
  'destination.published',
  'destination.failed',
  'destination.unconfirmed',
  'destination.blocked',
  'destination.awaiting_manual',
  'post.completed',
  'post.approval_requested',
  'post.approved',
  'post.rejected',
  'channel.needs_reauth',
  'channel.expiring',
  'channel.reconnected',
  'provider_app.misconfigured',
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];
