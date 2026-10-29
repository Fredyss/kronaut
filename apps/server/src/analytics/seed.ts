import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';

export const PULL_OFFSETS_HOURS = [1, 6, 24, 72, 168, 720] as const;

export function pullSteps(windowHours?: number): [step: number, hours: number][] {
  return [...PULL_OFFSETS_HOURS.entries()].filter(
    ([, hours]) => windowHours === undefined || hours < windowHours,
  );
}

export async function seedPulls(
  trx: TenantDb,
  ref: { readonly workspaceId: string; readonly id: string },
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
          sql<Date>`published_at + make_interval(hours => ${PULL_OFFSETS_HOURS[0]})`.as(
            'next_pull_at',
          ),
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
