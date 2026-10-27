import type { DocJson } from '@kronaut/compose';
import { defineRoute } from '@kronaut/contract';
import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { iso } from '../posts/dto.ts';
import { excerptOf, invalid, loadMains, visibleIn, zodDetails } from '../posts/list.ts';
import { pathId } from '../posts/params.ts';
import { type Owner, ownerOf, ownRows, unreadCount } from './owner.ts';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const Instant = z.iso.datetime();

const NotificationSchema = z.object({
  id: z.string(),
  kind: z.string(),
  createdAt: Instant,
  readAt: Instant.nullable(),
  postId: z.string().nullable(),
  destinationId: z.string().nullable(),
  socialAccountId: z.string(),
  provider: z.string(),
  reason: z.string().nullable(),
  state: z.string().nullable(),
  accountLabel: z.string().nullable(),
  accountHandle: z.string().nullable(),
  excerpt: z.string().nullable(),
});

const NotificationListSchema = z.object({
  items: z.array(NotificationSchema),
  unread: z.number().int().nonnegative(),
});

type NotificationListDto = z.output<typeof NotificationListSchema>;
export type NotificationDto = z.output<typeof NotificationSchema>;

export const notificationListRoute = defineRoute({
  id: 'notifications.list',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/notifications',
  auth: ['session'],
  action: 'posts:read',
  params: z.object({ workspaceId: z.string() }),
  query: z.object({ limit: z.string().optional(), unread: z.string().optional() }),
  response: NotificationListSchema,
  summary: 'List my notifications',
  description: `The caller's own notifications in this workspace, newest first (limit 1–${MAX_LIMIT}, default ${DEFAULT_LIMIT}); unread=true returns unread ones only. A scoped caller gets only notifications for channels in scope. unread is the caller's total unread count.`,
  tags: ['notifications'],
});

const ListQuery = z.strictObject({
  limit: z
    .string()
    .regex(/^[0-9]{1,3}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(MAX_LIMIT))
    .optional(),
  unread: z.enum(['true', 'false']).optional(),
});

export interface ListFilter {
  readonly limit: number;
  readonly unreadOnly: boolean;
  readonly id?: string;
}

function filterOf(query: z.output<typeof notificationListRoute.query>): ListFilter {
  const present = Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined));
  const parsed = ListQuery.safeParse(present);
  if (!parsed.success) throw invalid(zodDetails(parsed.error));
  return { limit: parsed.data.limit ?? DEFAULT_LIMIT, unreadOnly: parsed.data.unread === 'true' };
}

const PayloadSchema = z.object({
  provider: z.string(),
  socialAccountId: z.uuid(),
  state: z.string().optional(),
  reason: z.string().nullable(),
});

async function loadRows(trx: TenantDb, owner: Owner, filter: ListFilter) {
  let query = ownRows(trx, owner).select([
    'n.id',
    'n.kind',
    'n.created_at',
    'n.read_at',
    'n.post_id',
    'n.destination_id',
    'n.payload',
    'a.display_name',
    'a.handle',
  ]);
  if (filter.unreadOnly) query = query.where('n.read_at', 'is', null);
  if (filter.id !== undefined) query = query.where('n.id', '=', filter.id);
  return await query.orderBy('n.id', 'desc').limit(filter.limit).execute();
}

async function excerpts(
  trx: TenantDb,
  owner: Owner,
  postIds: readonly string[],
): Promise<Map<string, string>> {
  if (postIds.length === 0) return new Map();
  let query = trx
    .selectFrom('posts as p')
    .select('p.id')
    .where('p.workspace_id', '=', owner.workspaceId)
    .where('p.id', 'in', postIds)
    .where('p.deleted_at', 'is', null);
  if (owner.scope !== null) query = query.where(visibleIn(owner.scope));
  const visible = (await query.execute()).map((post) => post.id);
  const mains = visible.length === 0 ? [] : await loadMains(trx, owner.workspaceId, visible);
  const mainOf = new Map(mains.map((main) => [main.post_id, main]));
  return new Map(
    visible.map((id) => {
      const main = mainOf.get(id);
      return [id, main === undefined ? '' : excerptOf(main.doc as unknown as DocJson)];
    }),
  );
}

export async function notificationItems(
  trx: TenantDb,
  owner: Owner,
  filter: ListFilter,
): Promise<NotificationDto[]> {
  const rows = await loadRows(trx, owner, filter);
  const postIds = [...new Set(rows.flatMap((row) => (row.post_id === null ? [] : [row.post_id])))];
  const excerptFor = await excerpts(trx, owner, postIds);
  const items = rows.map((row) => {
    const payload = PayloadSchema.parse(row.payload);
    return NotificationSchema.parse({
      id: encodePublicId('notification', row.id),
      kind: row.kind,
      createdAt: iso(row.created_at),
      readAt: iso(row.read_at),
      postId: row.post_id === null ? null : encodePublicId('post', row.post_id),
      destinationId:
        row.destination_id === null ? null : encodePublicId('destination', row.destination_id),
      socialAccountId: encodePublicId('socialAccount', payload.socialAccountId),
      provider: payload.provider,
      reason: payload.reason,
      state: payload.state ?? null,
      accountLabel: row.display_name,
      accountHandle: row.handle,
      excerpt: row.post_id === null ? null : (excerptFor.get(row.post_id) ?? null),
    });
  });
  return items;
}

export async function listNotifications(
  trx: TenantDb,
  owner: Owner,
  filter: ListFilter,
): Promise<NotificationListDto> {
  const items = await notificationItems(trx, owner, filter);
  return { items, unread: await unreadCount(trx, owner) };
}

export function notificationListRoutes(): BoundRoute[] {
  return [
    bindRoute(notificationListRoute, async ({ params, query }, ctx) => {
      const owner = ownerOf(ctx, pathId('workspace', params.workspaceId));
      const filter = filterOf(query);
      const body = await ctx.tenant((trx) => listNotifications(trx, owner, filter));
      return { body };
    }),
  ];
}
