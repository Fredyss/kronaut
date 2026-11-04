import { ApiRequestError } from '@kronaut/sdk';
import { describe, expect, it } from 'vitest';
import { m } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { shortenerErrors } from './errors.ts';

function refused(status: number, code: string, details: { path: string; code: string }[] = []) {
  return new ApiRequestError(status, { error: { code, message: '', details } });
}

describe('shortenerErrors', () => {
  it('puts each detail at its field', () => {
    const error = refused(422, 'unprocessable', [
      { path: 'body.baseUrl', code: 'base_url_invalid' },
      { path: 'body.domain', code: 'domain_invalid' },
      { path: 'body.apiKey', code: 'api_key_invalid' },
    ]);
    expect(shortenerErrors(error)).toEqual({
      baseUrl: settingsText.settings_short_links_base_url_invalid(),
      domain: settingsText.settings_short_links_domain_invalid(),
      apiKey: settingsText.settings_short_links_api_key_invalid(),
    });
  });

  it('shows the key check at the key and an unreachable host at the base URL', () => {
    const key = refused(422, 'unprocessable', [
      { path: 'body.apiKey', code: 'shortener_unauthorized' },
    ]);
    expect(shortenerErrors(key)).toEqual({
      apiKey: settingsText.settings_short_links_unauthorized(),
    });
    const host = refused(422, 'unprocessable', [
      { path: 'body.baseUrl', code: 'shortener_unreachable' },
    ]);
    expect(shortenerErrors(host)).toEqual({
      baseUrl: settingsText.settings_short_links_unreachable(),
    });
  });

  it('shows a conflict and unknown failures for the whole form', () => {
    expect(shortenerErrors(refused(409, 'conflict'))).toEqual({
      form: settingsText.settings_short_links_conflict(),
    });
    const odd = refused(422, 'unprocessable', [{ path: 'body.domain', code: 'api_key_invalid' }]);
    expect(shortenerErrors(odd)).toEqual({ form: m.error_generic() });
    expect(shortenerErrors(new Error('offline'))).toEqual({ form: m.error_generic() });
  });
});
