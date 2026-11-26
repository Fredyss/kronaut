import { m as integrationsText } from '../../i18n/integrations.ts';
import type { Delivery, WebhookEvent } from './queries.ts';

const EVENT_LABELS: Readonly<Record<WebhookEvent, () => string>> = {
  'destination.published': () =>
    integrationsText.integrations_webhooks_event_destination_published(),
  'destination.failed': () => integrationsText.integrations_webhooks_event_destination_failed(),
  'destination.unconfirmed': () =>
    integrationsText.integrations_webhooks_event_destination_unconfirmed(),
  'destination.blocked': () => integrationsText.integrations_webhooks_event_destination_blocked(),
  'destination.awaiting_manual': () =>
    integrationsText.integrations_webhooks_event_destination_awaiting_manual(),
  'post.completed': () => integrationsText.integrations_webhooks_event_post_completed(),
  'post.approval_requested': () =>
    integrationsText.integrations_webhooks_event_post_approval_requested(),
  'post.approved': () => integrationsText.integrations_webhooks_event_post_approved(),
  'post.rejected': () => integrationsText.integrations_webhooks_event_post_rejected(),
  'channel.needs_reauth': () => integrationsText.integrations_webhooks_event_channel_needs_reauth(),
  'channel.expiring': () => integrationsText.integrations_webhooks_event_channel_expiring(),
  'channel.reconnected': () => integrationsText.integrations_webhooks_event_channel_reconnected(),
  'provider_app.misconfigured': () =>
    integrationsText.integrations_webhooks_event_provider_app_misconfigured(),
};

export const WEBHOOK_EVENTS = Object.keys(EVENT_LABELS) as readonly WebhookEvent[];

export function isWebhookEvent(type: string): type is WebhookEvent {
  return Object.hasOwn(EVENT_LABELS, type);
}

export function eventLabel(type: string): string {
  if (isWebhookEvent(type)) return EVENT_LABELS[type]();
  return type === 'webhook.test'
    ? integrationsText.integrations_webhooks_event_webhook_test()
    : type;
}

const STATE_LABELS: Readonly<Record<Delivery['state'], () => string>> = {
  pending: () => integrationsText.integrations_webhooks_state_pending(),
  delivering: () => integrationsText.integrations_webhooks_state_delivering(),
  delivered: () => integrationsText.integrations_webhooks_state_delivered(),
  retry_wait: () => integrationsText.integrations_webhooks_state_retry_wait(),
  dead: () => integrationsText.integrations_webhooks_state_dead(),
};

export function stateLabel(state: Delivery['state']): string {
  return STATE_LABELS[state]();
}
