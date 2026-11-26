import { m as settingsText } from '../../i18n/settings.ts';
import type { Delivery, WebhookEvent } from './queries.ts';

const EVENT_LABELS: Readonly<Record<WebhookEvent, () => string>> = {
  'destination.published': () => settingsText.settings_webhooks_event_destination_published(),
  'destination.failed': () => settingsText.settings_webhooks_event_destination_failed(),
  'destination.unconfirmed': () => settingsText.settings_webhooks_event_destination_unconfirmed(),
  'destination.blocked': () => settingsText.settings_webhooks_event_destination_blocked(),
  'destination.awaiting_manual': () =>
    settingsText.settings_webhooks_event_destination_awaiting_manual(),
  'post.completed': () => settingsText.settings_webhooks_event_post_completed(),
  'post.approval_requested': () => settingsText.settings_webhooks_event_post_approval_requested(),
  'post.approved': () => settingsText.settings_webhooks_event_post_approved(),
  'post.rejected': () => settingsText.settings_webhooks_event_post_rejected(),
  'channel.needs_reauth': () => settingsText.settings_webhooks_event_channel_needs_reauth(),
  'channel.expiring': () => settingsText.settings_webhooks_event_channel_expiring(),
  'channel.reconnected': () => settingsText.settings_webhooks_event_channel_reconnected(),
  'provider_app.misconfigured': () =>
    settingsText.settings_webhooks_event_provider_app_misconfigured(),
};

export const WEBHOOK_EVENTS = Object.keys(EVENT_LABELS) as readonly WebhookEvent[];

export function isWebhookEvent(type: string): type is WebhookEvent {
  return Object.hasOwn(EVENT_LABELS, type);
}

export function eventLabel(type: string): string {
  if (isWebhookEvent(type)) return EVENT_LABELS[type]();
  return type === 'webhook.test' ? settingsText.settings_webhooks_event_webhook_test() : type;
}

const STATE_LABELS: Readonly<Record<Delivery['state'], () => string>> = {
  pending: () => settingsText.settings_webhooks_state_pending(),
  delivering: () => settingsText.settings_webhooks_state_delivering(),
  delivered: () => settingsText.settings_webhooks_state_delivered(),
  retry_wait: () => settingsText.settings_webhooks_state_retry_wait(),
  dead: () => settingsText.settings_webhooks_state_dead(),
};

export function stateLabel(state: Delivery['state']): string {
  return STATE_LABELS[state]();
}
