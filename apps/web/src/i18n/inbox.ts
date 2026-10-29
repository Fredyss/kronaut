import * as en from '@kronaut/i18n/inbox/messages/en';
import { routeMessages } from './route-messages.ts';

export const m = await routeMessages(en, {
  sk: () => import('@kronaut/i18n/inbox/messages/sk'),
  cs: () => import('@kronaut/i18n/inbox/messages/cs'),
});
