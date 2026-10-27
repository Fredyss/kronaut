import { reasonLabel as label } from '@kronaut/i18n/notifications';
import { m } from '../i18n.ts';

export const RECONNECT: ReadonlySet<string> = new Set([
  'account_needs_reauth',
  'account_disconnected',
  'refresh_token_lost',
]);

export function reasonLabel(code: string): string {
  return label(m, code);
}
