import { detailCodes, errorCode, errorDetails } from '../../base/api/errors.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as integrationsText } from '../../i18n/integrations.ts';

export interface EndpointErrors {
  readonly url?: string;
  readonly form?: string;
}

export function endpointErrors(error: unknown): EndpointErrors {
  const details = errorDetails(error);
  if (details.some((detail) => detail.code === 'webhook_limit')) {
    return { form: integrationsText.integrations_webhooks_limit() };
  }
  const url = details.some((detail) => detail.path === 'body.url' && detail.code === 'url_invalid');
  const others = details.filter((detail) => detail.path !== 'body.url');
  if (url && others.length === 0)
    return { url: integrationsText.integrations_webhooks_url_invalid() };
  return {
    ...(url ? { url: integrationsText.integrations_webhooks_url_invalid() } : {}),
    form: apiErrorMessage(errorCode(error)),
  };
}

export function testError(error: unknown): string {
  if (errorCode(error) === 'rate_limited')
    return integrationsText.integrations_webhooks_test_limit();
  if (detailCodes(error).includes('endpoint_disabled')) {
    return integrationsText.integrations_webhooks_test_disabled();
  }
  return apiErrorMessage(errorCode(error));
}
