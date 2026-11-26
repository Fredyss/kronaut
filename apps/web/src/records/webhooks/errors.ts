import { detailCodes, errorCode, errorDetails } from '../../base/api/errors.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';

export interface EndpointErrors {
  readonly url?: string;
  readonly form?: string;
}

export function endpointErrors(error: unknown): EndpointErrors {
  const details = errorDetails(error);
  if (details.some((detail) => detail.code === 'webhook_limit')) {
    return { form: settingsText.settings_webhooks_limit() };
  }
  const url = details.some((detail) => detail.path === 'body.url' && detail.code === 'url_invalid');
  const others = details.filter((detail) => detail.path !== 'body.url');
  if (url && others.length === 0) return { url: settingsText.settings_webhooks_url_invalid() };
  return {
    ...(url ? { url: settingsText.settings_webhooks_url_invalid() } : {}),
    form: apiErrorMessage(errorCode(error)),
  };
}

export function testError(error: unknown): string {
  if (errorCode(error) === 'rate_limited') return settingsText.settings_webhooks_test_limit();
  if (detailCodes(error).includes('endpoint_disabled')) {
    return settingsText.settings_webhooks_test_disabled();
  }
  return apiErrorMessage(errorCode(error));
}
