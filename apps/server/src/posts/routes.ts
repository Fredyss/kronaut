import type { BoundRoute } from '../http/types.ts';
import { cancelRoutes } from './cancel.ts';
import { createRoutes } from './create.ts';
import type { PostRouteDeps } from './deps.ts';
import { getRoutes } from './get.ts';
import { listRoutes } from './list.ts';
import { rescheduleRoutes } from './reschedule.ts';
import { scheduleRoutes } from './schedule.ts';
import { unscheduleRoutes } from './unschedule.ts';
import { updateRoutes } from './update.ts';

export function postRoutes(deps: PostRouteDeps): BoundRoute[] {
  return [
    ...createRoutes(deps),
    ...getRoutes(),
    ...listRoutes(),
    ...updateRoutes(deps),
    ...scheduleRoutes(deps),
    ...unscheduleRoutes(),
    ...rescheduleRoutes(deps),
    ...cancelRoutes(),
  ];
}
