import { detailCodes, errorCode } from '../api.ts';
import { m as settingsText } from '../i18n/settings.ts';
import { apiErrorMessage } from '../i18n.ts';

export function savedTextError(error: unknown): string {
  const code = errorCode(error);
  if (code === 'saved_text_exists') return settingsText.settings_saved_text_exists();
  if (code === 'saved_text_limit') return settingsText.settings_saved_text_limit();
  const details = detailCodes(error);
  if (details.includes('saved_text_name_invalid')) {
    return settingsText.settings_saved_text_name_invalid();
  }
  if (details.includes('saved_text_invalid')) return settingsText.settings_saved_text_invalid();
  return apiErrorMessage(code);
}
