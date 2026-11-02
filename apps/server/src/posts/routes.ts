import type { BoundRoute } from '../http/request.ts';
import type { PostRouteDeps } from './deps.ts';
import { createRoutes } from './draft/create.ts';
import { deleteRoutes } from './draft/delete.ts';
import { duplicateRoutes } from './draft/duplicate.ts';
import { updateRoutes } from './draft/update.ts';
import { getRoutes } from './read/get.ts';
import { listRoutes } from './read/list.ts';
import { approvalRequestRoutes } from './schedule/approval-request.ts';
import { cancelRoutes } from './schedule/cancel.ts';
import { rescheduleRoutes } from './schedule/reschedule.ts';
import { scheduleRoutes } from './schedule/schedule.ts';
import { unscheduleRoutes } from './schedule/unschedule.ts';

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
    ...deleteRoutes(),
    ...duplicateRoutes(deps),
    ...approvalRequestRoutes(deps),
  ];
}
