import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { requireSession } from '../auth/events.ts';
import { readUser } from '../auth/profile.ts';
import type { CronTask } from '../cron.ts';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { pathId } from '../posts/params.ts';
import type { ProviderRegistry } from '../providers.ts';
import { isInstanceAdmin } from './instance-admins.ts';
import {
  CronStatusSchema,
  cronStatus,
  IncidentSchema,
  incidentStatus,
  SloWindowSchema,
  sloStatus,
} from './status.ts';
import { apiVersionSunsets, SUNSET_CRITICAL_DAYS, SUNSET_WARN_DAYS, utcToday } from './sunset.ts';

const NOT_INSTANCE_ADMIN =
  'Only the instance admins listed in KRONAUT_INSTANCE_ADMINS can read this.';

const SystemStatusSchema = z.object({
  slo: z.object({
    targets: z.object({
      onTimePct: z.number(),
      duplicates: z.number().int(),
      unconfirmedPct: z.number(),
    }),
    day: SloWindowSchema,
    week: SloWindowSchema,
  }),
  cron: z.array(CronStatusSchema),
  incidents: z.array(IncidentSchema),
  apiVersions: z.array(
    z.object({
      provider: z.string(),
      version: z.string(),
      sunsetOn: z.iso.date().nullable(),
      daysLeft: z.number().int().nullable(),
      level: z.enum(['ok', 'warn', 'critical']),
    }),
  ),
});

export const systemStatusRoute = defineRoute({
  id: 'system.status',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/system',
  auth: 'session',
  action: 'instance:read',
  params: z.object({ workspaceId: z.string() }),
  response: SystemStatusSchema,
  summary: 'Read the instance status',
  description: `Instance-wide: only for a session whose email is listed in KRONAUT_INSTANCE_ADMINS and who is an owner or admin of the workspace; never an API key. slo holds the publishing SLOs for the last 24 hours (day) and 7 days (week): onTimePct excludes provider 5xx, and a percentage is null when the window is empty. cron is the last run per task; stale means no run, or a start older than twice the task's interval, and detail is set only for a failed run. incidents are the open provider app incidents plus those resolved in the last 7 days, newest first, at most 50. apiVersions are the pinned provider API versions: warn at ${SUNSET_WARN_DAYS} days or fewer before the sunset, critical at ${SUNSET_CRITICAL_DAYS} or fewer or after it.`,
  tags: ['system'],
});

export interface SystemRouteDeps {
  readonly providers: ProviderRegistry;
  readonly cronTasks: readonly CronTask[];
  readonly instanceAdmins: readonly string[];
}

export function systemStatusRoutes({
  providers,
  cronTasks,
  instanceAdmins,
}: SystemRouteDeps): BoundRoute[] {
  return [
    bindRoute(systemStatusRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('instance:read', { workspaceId });
      const { userId } = requireSession(ctx);
      const status = await ctx.tenant(async (trx) => {
        const user = await readUser(trx, userId);
        if (!isInstanceAdmin(instanceAdmins, user?.email ?? null)) {
          throw new HttpError('forbidden', NOT_INSTANCE_ADMIN);
        }
        return {
          slo: await sloStatus(trx, ctx.now),
          cron: await cronStatus(trx, ctx.now, cronTasks),
          incidents: await incidentStatus(trx, ctx.now),
        };
      });
      const manifests = providers.list().map((entry) => entry.manifest);
      return { body: { ...status, apiVersions: apiVersionSunsets(manifests, utcToday(ctx.now)) } };
    }),
  ];
}
