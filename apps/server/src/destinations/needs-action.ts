import type { DocJson } from '@kronaut/compose';
import { defineRoute } from '@kronaut/contract';
import { type AccessScope, encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { iso } from '../posts/dto.ts';
import { excerptOf, invalid, loadMains, visibleIn, zodDetails } from '../posts/list.ts';
import { pathId } from '../posts/params.ts';
import { NEEDS_ACTION } from './locked.ts';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const Instant = z.iso.datetime();

export const NeedsActionItemSchema = z.object({
  destinationId: z.string(),
  version: z.number().int().positive(),
  state: z.enum(NEEDS_ACTION),
  reason: z.string().nullable(),
  postId: z.string(),
  postVersion: z.number().int().positive(),
  excerpt: z.string(),
  accountId: z.string(),
  provider: z.string(),
  accountLabel: z.string(),
  accountHandle: z.string().nullable(),
  publishType: z.string(),
  deliveryMode: z.enum(['auto', 'reminder']),
  scheduledAt: Instant.nullable(),
  remoteUrl: z.string().nullable(),
  updatedAt: Instant,
});

const NeedsActionSchema = z.object({
  items: z.array(NeedsActionItemSchema),
  total: z.number().int().nonnegative(),
  truncated: z.boolean(),
});

type NeedsActionDto = z.output<typeof NeedsActionSchema>;

export const needsActionRoute = defineRoute({
  id: 'destinations.needs_action',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/needs-action',
  auth: ['session', 'grant'],
  action: 'posts:read',
  params: z.object({ workspaceId: z.string() }),
  query: z.object({ limit: z.string().optional() }),
  response: NeedsActionSchema,
  summary: 'List destinations that need action',
  description: `The unconfirmed, failed, blocked and awaiting-manual destinations of the posts the caller can see, newest first (limit 1–${MAX_LIMIT}, default ${DEFAULT_LIMIT}).`,
  tags: ['destinations'],
});

const LimitQuery = z.strictObject({
  limit: z
    .string()
    .regex(/^[0-9]{1,3}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(MAX_LIMIT))
    .optional(),
});

function limitOf(query: z.output<typeof needsActionRoute.query>): number {
  const parsed = LimitQuery.safeParse(query.limit === undefined ? {} : { limit: query.limit });
  if (!parsed.success) throw invalid(zodDetails(parsed.error));
  return parsed.data.limit ?? DEFAULT_LIMIT;
}

// Literal states, so the planner can match the partial index ix_dest_attention.
const ATTENTION = sql<boolean>`d.state IN (${sql.join(NEEDS_ACTION.map((state) => sql.lit(state)))})`;

export function attentionQuery(trx: TenantDb, workspaceId: string, scope: AccessScope | null) {
  const query = trx
    .selectFrom('post_destinations as d')
    .innerJoin('posts as p', (join) =>
      join.onRef('p.workspace_id', '=', 'd.workspace_id').onRef('p.id', '=', 'd.post_id'),
    )
    .where('d.workspace_id', '=', workspaceId)
    .where(ATTENTION)
    .where('p.deleted_at', 'is', null);
  return scope === null ? query : query.where(visibleIn(scope));
}

async function loadAttention(
  trx: TenantDb,
  workspaceId: string,
  scope: AccessScope | null,
  limit: number,
) {
  return await attentionQuery(trx, workspaceId, scope)
    .innerJoin('social_accounts as a', (join) =>
      join.onRef('a.workspace_id', '=', 'd.workspace_id').onRef('a.id', '=', 'd.social_account_id'),
    )
    .select([
      'd.id',
      'd.version',
      'd.state',
      'd.state_reason',
      'd.post_id',
      'p.version as post_version',
      'd.social_account_id',
      'd.provider',
      'd.account_label',
      'a.handle',
      'd.publish_type',
      'd.delivery_mode',
      'd.scheduled_at',
      'd.remote_url',
      'd.updated_at',
    ])
    .orderBy('d.updated_at', 'desc')
    .orderBy('d.id', 'desc')
    .limit(limit)
    .execute();
}

export async function listNeedsAction(
  trx: TenantDb,
  workspaceId: string,
  scope: AccessScope | null,
  limit: number,
): Promise<NeedsActionDto> {
  const rows = await loadAttention(trx, workspaceId, scope, limit);
  const { total } = await attentionQuery(trx, workspaceId, scope)
    .select((eb) => eb.fn.countAll<string>().as('total'))
    .executeTakeFirstOrThrow();
  const postIds = [...new Set(rows.map((row) => row.post_id))];
  const mains = postIds.length === 0 ? [] : await loadMains(trx, workspaceId, postIds);
  const mainOf = new Map(mains.map((main) => [main.post_id, main]));
  const items = rows.map((row) => {
    const main = mainOf.get(row.post_id);
    return NeedsActionItemSchema.parse({
      destinationId: encodePublicId('destination', row.id),
      version: row.version,
      state: row.state,
      reason: row.state_reason,
      postId: encodePublicId('post', row.post_id),
      postVersion: row.post_version,
      excerpt: main === undefined ? '' : excerptOf(main.doc as unknown as DocJson),
      accountId: encodePublicId('socialAccount', row.social_account_id),
      provider: row.provider,
      accountLabel: row.account_label,
      accountHandle: row.handle,
      publishType: row.publish_type,
      deliveryMode: row.delivery_mode,
      scheduledAt: iso(row.scheduled_at),
      remoteUrl: row.remote_url,
      updatedAt: iso(row.updated_at),
    });
  });
  return { items, total: Number(total), truncated: Number(total) > items.length };
}

export function needsActionRoutes(): BoundRoute[] {
  return [
    bindRoute(needsActionRoute, async ({ params, query }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const decision = ctx.authorize('posts:read', { workspaceId });
      const scope = decision.kind === 'allow_scoped' ? decision.scope : null;
      const limit = limitOf(query);
      const body = await ctx.tenant((trx) => listNeedsAction(trx, workspaceId, scope, limit));
      return { body };
    }),
  ];
}
