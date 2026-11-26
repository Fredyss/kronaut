import { analyticsScheduleOf, type ProviderManifest } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

export interface PullPlan {
  readonly hours: readonly number[];
  readonly windowHours?: number | undefined;
}

export function pullPlanOf(manifest: ProviderManifest, postType: string): PullPlan {
  const type = manifest.postTypes.find((entry) => entry.id === postType);
  return {
    hours: analyticsScheduleOf(manifest).pullHours,
    windowHours: type?.analytics?.windowHours,
  };
}

export function pullSteps(plan: PullPlan): [step: number, hours: number][] {
  return [...plan.hours.entries()].filter(
    ([, hours]) => plan.windowHours === undefined || hours < plan.windowHours,
  );
}

export function stepInside(step: number, plan: PullPlan): boolean {
  return pullSteps(plan).some(([inside]) => inside === step);
}

export function firstPullHours(manifest: ProviderManifest, postType: string): number | null {
  if (!manifest.capabilities.analytics) return null;
  const [first] = pullSteps(pullPlanOf(manifest, postType));
  return first === undefined || first[0] !== 0 ? null : first[1];
}

export async function seedPulls(
  trx: TenantDb,
  ref: { readonly workspaceId: string; readonly id: string },
  firstHours: number,
): Promise<void> {
  await trx
    .insertInto('destination_metric_pulls')
    .columns(['workspace_id', 'destination_id', 'step', 'next_pull_at'])
    .expression((eb) =>
      eb
        .selectFrom('post_destinations')
        .select([
          'workspace_id',
          'id',
          sql<number>`0`.as('step'),
          sql<Date>`published_at + make_interval(hours => ${firstHours})`.as('next_pull_at'),
        ])
        .where('workspace_id', '=', ref.workspaceId)
        .where('id', '=', ref.id)
        .where('state', '=', 'published')
        .where('published_at', 'is not', null)
        .where('remote_id', 'is not', null),
    )
    .onConflict((oc) => oc.doNothing())
    .execute();
}
