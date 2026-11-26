import { errorCode, errorDetails } from '../../base/api/errors.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';

type Slot = 'clientId' | 'clientSecret' | 'form';

export type WorkspaceAppErrors = Readonly<Partial<Record<Slot, string>>>;

const KNOWN: Readonly<Record<string, readonly [Slot, () => string]>> = {
  'body.clientId:invalid': [
    'clientId',
    () => settingsText.settings_workspace_apps_client_id_invalid(),
  ],
  'body.clientId:client_id_taken': [
    'clientId',
    () => settingsText.settings_workspace_apps_client_id_taken(),
  ],
  'body.clientSecret:invalid': [
    'clientSecret',
    () => settingsText.settings_workspace_apps_client_secret_invalid(),
  ],
  'body.provider:workspace_app_exists': [
    'form',
    () => settingsText.settings_workspace_apps_exists(),
  ],
  'body.provider:not_supported': [
    'form',
    () => settingsText.settings_workspace_apps_not_supported(),
  ],
  'params.provider:not_supported': [
    'form',
    () => settingsText.settings_workspace_apps_not_supported(),
  ],
};

export function workspaceAppErrors(error: unknown): WorkspaceAppErrors {
  const found: Partial<Record<Slot, string>> = {};
  const details = errorDetails(error);
  const matched = details.filter((detail) => {
    const key = `${detail.path}:${detail.code}`;
    const known = Object.hasOwn(KNOWN, key) ? KNOWN[key] : undefined;
    if (known !== undefined) found[known[0]] = known[1]();
    return known !== undefined;
  });
  if (details.length > 0 && matched.length === details.length) return found;
  return { ...found, form: apiErrorMessage(errorCode(error)) };
}
