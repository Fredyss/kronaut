import { m as integrationsText } from '../../i18n/integrations.ts';

const BLOCKED = () => integrationsText.integrations_webhooks_error_blocked();

const DELIVERY_ERRORS: Readonly<Record<string, () => string>> = {
  blocked_address: () => integrationsText.integrations_webhooks_error_private(),
  blocked_host: BLOCKED,
  blocked_scheme: BLOCKED,
  blocked_port: BLOCKED,
  too_many_redirects: () => integrationsText.integrations_webhooks_error_redirect(),
  response_too_large: () => integrationsText.integrations_webhooks_error_too_large(),
  timeout: () => integrationsText.integrations_webhooks_error_timeout(),
  dns_failure: () => integrationsText.integrations_webhooks_error_dns(),
  network: () => integrationsText.integrations_webhooks_error_network(),
  endpoint_disabled: () => integrationsText.integrations_webhooks_error_disabled(),
  interrupted: () => integrationsText.integrations_webhooks_error_interrupted(),
  internal: () => integrationsText.integrations_webhooks_error_internal(),
};

export function deliveryError(code: string): string {
  const known = Object.hasOwn(DELIVERY_ERRORS, code) ? DELIVERY_ERRORS[code] : undefined;
  return known === undefined ? integrationsText.integrations_webhooks_error_generic() : known();
}
