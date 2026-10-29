import * as en from '@kronaut/i18n/calendar/messages/en';
import { routeMessages } from './route-messages.ts';

export const m = await routeMessages(en, {
  sk: () => import('@kronaut/i18n/calendar/messages/sk'),
  cs: () => import('@kronaut/i18n/calendar/messages/cs'),
});
