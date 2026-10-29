import * as en from '@kronaut/i18n/settings/messages/en';
import { routeMessages } from './route-messages.ts';

export const m = await routeMessages(en, {
  sk: () => import('@kronaut/i18n/settings/messages/sk'),
  cs: () => import('@kronaut/i18n/settings/messages/cs'),
});
