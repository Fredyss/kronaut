import { findLinks } from '@kronaut/compose';
import type { PostTypeSpec } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import type { DestinationJob } from '../../../infrastructure/jobs/jobs.ts';
import { frozenSkips } from '../chain.ts';
import { readResolved } from '../input.ts';
import { publishItems, type ResolvedDestination } from '../snapshot.ts';
import type { PublishDeps } from '../task.ts';

export interface LinkSource {
  readonly state: string;
  readonly provider: string;
  readonly resolved: ResolvedDestination;
  readonly links: readonly string[];
}

function destinationRow(trx: TenantDb, job: DestinationJob) {
  return trx
    .selectFrom('post_destinations')
    .select(['state', 'post_id', 'provider', 'social_account_id', 'publish_type'])
    .select('frozen_post_version')
    .where('workspace_id', '=', job.workspaceId)
    .where('id', '=', job.id)
    .executeTakeFirst();
}

type DestinationRow = NonNullable<Awaited<ReturnType<typeof destinationRow>>>;

async function newestVersion(trx: TenantDb, job: DestinationJob, row: DestinationRow) {
  const revision = await trx
    .selectFrom('revision_destinations')
    .select('post_version')
    .where('workspace_id', '=', job.workspaceId)
    .where('post_id', '=', row.post_id)
    .where('social_account_id', '=', row.social_account_id)
    .where('publish_type', '=', row.publish_type)
    .orderBy('post_version', 'desc')
    .limit(1)
    .executeTakeFirst();
  return revision?.post_version ?? null;
}

function sentLinks(resolved: ResolvedDestination, postType: PostTypeSpec): string[] {
  const items = publishItems(resolved);
  const skipped = frozenSkips(postType, items);
  const links = items.flatMap((item) => (skipped.has(item.position) ? [] : findLinks(item.text)));
  return [...new Set(links)];
}

export async function linkSource(
  deps: Pick<PublishDeps, 'providers'>,
  trx: TenantDb,
  job: DestinationJob,
): Promise<LinkSource | null> {
  const row = await destinationRow(trx, job);
  if (row === undefined) return null;
  const version = row.frozen_post_version ?? (await newestVersion(trx, job, row));
  if (version === null) return null;
  const resolved = await readResolved(trx, {
    workspaceId: job.workspaceId,
    postId: row.post_id,
    frozenPostVersion: version,
    socialAccountId: row.social_account_id,
    publishType: row.publish_type,
  });
  if (resolved?.destination.shorten !== true) return null;
  const postType = deps.providers
    .get(row.provider)
    ?.manifest.postTypes.find((spec) => spec.id === row.publish_type);
  if (postType === undefined) return null;
  return {
    state: row.state,
    provider: row.provider,
    resolved,
    links: sentLinks(resolved, postType),
  };
}
