import { errorCode, errorDetails } from '../../base/api/errors.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { API_KEY_NAME_MAX, RATE_LIMIT_MAX } from './queries.ts';

type Field = 'name' | 'scopes' | 'access' | 'expiry' | 'rateLimit';

export type KeyErrors = Partial<Record<Field | 'form', string>>;

const CODES: Readonly<Record<string, readonly [Field, () => string]>> = {
  name_invalid: [
    'name',
    () => settingsText.settings_api_keys_name_invalid({ max: API_KEY_NAME_MAX }),
  ],
  never_grantable: ['scopes', () => settingsText.settings_api_keys_scopes_invalid()],
  unknown_scope: ['scopes', () => settingsText.settings_api_keys_scopes_invalid()],
  not_restricted: ['access', () => settingsText.settings_api_keys_access_not_restricted()],
  in_past: ['expiry', () => settingsText.settings_api_keys_expiry_in_past()],
};

function fieldError(path: string, code: string): readonly [Field, string] | null {
  const known = Object.hasOwn(CODES, code) ? CODES[code] : undefined;
  if (known !== undefined) return [known[0], known[1]()];
  if (code === 'invalid' && path.startsWith('body.access')) {
    return ['access', settingsText.settings_api_keys_access_invalid()];
  }
  if (path === 'body.rateLimitPerMinute') {
    return [
      'rateLimit',
      settingsText.settings_api_keys_rate_limit_invalid({ max: RATE_LIMIT_MAX }),
    ];
  }
  return null;
}

export function keyErrors(error: unknown): KeyErrors {
  const found = errorDetails(error).map((detail) => fieldError(detail.path, detail.code));
  const fields = found.filter((entry) => entry !== null);
  const errors: KeyErrors = Object.fromEntries(fields);
  if (fields.length > 0 && fields.length === found.length) return errors;
  return { ...errors, form: apiErrorMessage(errorCode(error)) };
}
