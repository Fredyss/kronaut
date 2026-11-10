import { errorCode, errorDetails } from '../../base/api/errors.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';

type Field = 'baseUrl' | 'domain' | 'apiKey';

export type ShortenerErrors = Readonly<Partial<Record<Field | 'form', string>>>;

const FIELD_ERRORS: Readonly<Record<string, readonly [Field, () => string]>> = {
  base_url_invalid: ['baseUrl', () => settingsText.settings_short_links_base_url_invalid()],
  shortener_unreachable: ['baseUrl', () => settingsText.settings_short_links_unreachable()],
  domain_invalid: ['domain', () => settingsText.settings_short_links_domain_invalid()],
  api_key_invalid: ['apiKey', () => settingsText.settings_short_links_api_key_invalid()],
  api_key_required: ['apiKey', () => settingsText.settings_short_links_api_key_required()],
  shortener_unauthorized: ['apiKey', () => settingsText.settings_short_links_unauthorized()],
};

const PATHS: Readonly<Record<string, Field>> = {
  'body.baseUrl': 'baseUrl',
  'body.domain': 'domain',
  'body.apiKey': 'apiKey',
};

export function shortenerErrors(error: unknown): ShortenerErrors {
  const code = errorCode(error);
  if (code === 'conflict') return { form: settingsText.settings_short_links_conflict() };
  const fields: Partial<Record<Field, string>> = {};
  let unknown = false;
  for (const detail of errorDetails(error)) {
    const known = Object.hasOwn(FIELD_ERRORS, detail.code) ? FIELD_ERRORS[detail.code] : undefined;
    const field = Object.hasOwn(PATHS, detail.path) ? PATHS[detail.path] : undefined;
    if (known === undefined || known[0] !== field) unknown = true;
    else fields[field] = known[1]();
  }
  const found = Object.keys(fields).length > 0;
  return found && !unknown ? fields : { ...fields, form: apiErrorMessage(code) };
}
