import { defineRoute } from '@kronaut/contract';
import { encodePublicId, POST_METRICS, type PostMetric } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { PostParams, pathId } from '../http/params.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { postResource } from '../posts/units.ts';
import { storedValue } from './store.ts';

const SNAPSHOT_CAP = 500;

const Metric = z.enum(POST_METRICS);
const Value = z.number().int().nonnegative().nullable();

export const PostMetricsSchema = z.object({
  destinations: z.array(
    z.object({
      destinationId: z.string(),
      channelId: z.string(),
      latest: z.partialRecord(Metric, z.object({ value: Value, observedAt: z.iso.datetime() })),
      snapshots: z.array(z.object({ metric: Metric, value: Value, observedAt: z.iso.datetime() })),
    }),
  ),
});

export const postMetricsRoute = defineRoute({
  id: 'analytics.post_metrics',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/posts/:postId/metrics',
  auth: ['session', 'grant'],
  action: 'analytics:read',
  params: PostParams,
  response: PostMetricsSchema,
  summary: "Read a post's metrics",
  description: `Per published destination that has metrics: the latest value of each metric with when it was read, and its snapshots oldest first (at most ${SNAPSHOT_CAP}). A snapshot is stored only when a value changes. A null value means the network did not report it; a metric the network never reports is absent.`,
  tags: ['analytics'],
});

interface SnapshotRow {
  readonly metric: string;
  readonly value: string | null;
  readonly observed_at: Date;
}

function snapshotDto(row: SnapshotRow) {
  return {
    metric: row.metric as PostMetric,
    value: storedValue(row.value),
    observedAt: row.observed_at.toISOString(),
  };
}

function snapshotsOf(trx: TenantDb, workspaceId: string, destinationId: string) {
  return trx
    .selectFrom('post_metric_snapshots')
    .select(['metric', 'value', 'observed_at'])
    .where('workspace_id', '=', workspaceId)
    .where('destination_id', '=', destinationId);
}

async function destinationMetrics(
  trx: TenantDb,
  workspaceId: string,
  destination: { readonly id: string; readonly social_account_id: string },
) {
  const latest = await snapshotsOf(trx, workspaceId, destination.id)
    .distinctOn('metric')
    .orderBy('metric')
    .orderBy('observed_at', 'desc')
    .execute();
  if (latest.length === 0) return [];
  const snapshots = await snapshotsOf(trx, workspaceId, destination.id)
    .orderBy('observed_at')
    .orderBy('metric')
    .limit(SNAPSHOT_CAP)
    .execute();
  return [
    {
      destinationId: encodePublicId('destination', destination.id),
      channelId: encodePublicId('socialAccount', destination.social_account_id),
      latest: Object.fromEntries(
        latest.map((row) => {
          const { metric, ...rest } = snapshotDto(row);
          return [metric, rest];
        }),
      ),
      snapshots: snapshots.map(snapshotDto),
    },
  ];
}

async function readMetrics(trx: TenantDb, workspaceId: string, postId: string) {
  const destinations = await trx
    .selectFrom('post_destinations')
    .select(['id', 'social_account_id'])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .where('state', '=', 'published')
    .orderBy('id')
    .execute();
  const rows = [];
  for (const destination of destinations) {
    rows.push(...(await destinationMetrics(trx, workspaceId, destination)));
  }
  return PostMetricsSchema.parse({ destinations: rows });
}

export function bindPostMetrics(): BoundRoute {
  return bindRoute(postMetricsRoute, async ({ params }, ctx) => {
    const workspaceId = pathId('workspace', params.workspaceId);
    const postId = pathId('post', params.postId);
    const body = await ctx.tenant(async (trx) => {
      ctx.authorize('analytics:read', await postResource(trx, workspaceId, postId));
      return await readMetrics(trx, workspaceId, postId);
    });
    return { body };
  });
}
