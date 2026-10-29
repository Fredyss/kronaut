import * as en from '@kronaut/i18n/media/messages/en';
import { routeMessages } from './route-messages.ts';

export const m = await routeMessages(en, {
  sk: () => import('@kronaut/i18n/media/messages/sk'),
  cs: () => import('@kronaut/i18n/media/messages/cs'),
});
