import { ApiRequestError } from '@kronaut/sdk';
import { describe, expect, it } from 'vitest';
import { m } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { workspaceAppErrors } from './errors.ts';

function failed(status: number, code: string, ...details: [path: string, code: string][]) {
  const list = details.map(([path, detailCode]) => ({ path, code: detailCode }));
  return new ApiRequestError(status, { error: { code, message: '', details: list } });
}

describe('workspaceAppErrors', () => {
  it('shows a bad or taken client id at the client id field', () => {
    expect(workspaceAppErrors(failed(422, 'unprocessable', ['body.clientId', 'invalid']))).toEqual({
      clientId: settingsText.settings_workspace_apps_client_id_invalid(),
    });
    expect(
      workspaceAppErrors(failed(409, 'conflict', ['body.clientId', 'client_id_taken'])),
    ).toEqual({ clientId: settingsText.settings_workspace_apps_client_id_taken() });
  });

  it('shows a rejected secret at the secret field', () => {
    expect(
      workspaceAppErrors(failed(422, 'unprocessable', ['body.clientSecret', 'invalid'])),
    ).toEqual({ clientSecret: settingsText.settings_workspace_apps_client_secret_invalid() });
  });

  it('shows an existing app and an unsupported provider for the whole form', () => {
    expect(
      workspaceAppErrors(failed(409, 'conflict', ['body.provider', 'workspace_app_exists'])),
    ).toEqual({ form: settingsText.settings_workspace_apps_exists() });
    expect(
      workspaceAppErrors(failed(422, 'unprocessable', ['params.provider', 'not_supported'])),
    ).toEqual({ form: settingsText.settings_workspace_apps_not_supported() });
  });

  it('falls back to the generic message for anything else', () => {
    expect(workspaceAppErrors(failed(404, 'not_found'))).toEqual({ form: m.error_generic() });
    expect(workspaceAppErrors(new Error('offline'))).toEqual({ form: m.error_generic() });
  });
});
