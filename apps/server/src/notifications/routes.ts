import type { BoundRoute } from '../http/types.ts';
import { notificationListRoutes } from './list.ts';
import { notificationMarkReadRoutes } from './mark-read.ts';
import { notificationPreferenceRoutes } from './preferences.ts';

export function notificationRoutes(): BoundRoute[] {
  return [
    ...notificationListRoutes(),
    ...notificationMarkReadRoutes(),
    ...notificationPreferenceRoutes(),
  ];
}
