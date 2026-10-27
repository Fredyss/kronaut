import { defineRoute } from '@kronaut/contract';
import { decodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { HttpError, type IssueDetail } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { pathId } from '../posts/params.ts';
import { type Owner, ownerOf, unreadCount } from './owner.ts';

const MAX_IDS = 100;

const MarkReadBody = z.union([
  z.strictObject({ ids: z.array(z.string()).min(1).max(MAX_IDS) }),
  z.strictObject({ upTo: z.string() }),
]);

type MarkRead = { readonly ids: readonly string[] } | { readonly upTo: string };

function decoded(body: z.output<typeof MarkReadBody>): MarkRead {
  const details: IssueDetail[] = [];
  const decode = (value: string, path: string): string => {
    const id = decodePublicId('notification', value);
    if (id === null) details.push({ path, code: 'not_found' });
    return id ?? '';
  };
  const ids =
    'ids' in body
      ? { ids: body.ids.map((id, index) => decode(id, `body.ids.${index}`)) }
      : { upTo: decode(body.upTo, 'body.upTo') };
  if (details.length > 0) {
    throw new HttpError('unprocessable', 'The notification ids are invalid.', { details });
  }
  return ids;
}

export const notificationMarkReadRoute = defineRoute({
  id: 'notifications.mark_read',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/notifications/read',
  auth: ['session'],
  action: 'posts:read',
  params: z.object({ workspaceId: z.string() }),
  body: MarkReadBody,
  response: z.object({ unread: z.number().int().nonnegative() }),
  summary: 'Mark my notifications read',
  description: `Marks the caller's own notifications read: the listed ids (1–${MAX_IDS}), or with upTo every unread one up to and including that id (ids order to the millisecond). Ids that aren't the caller's are ignored. Returns the new unread count.`,
  tags: ['notifications'],
});

export async function markRead(trx: TenantDb, owner: Owner, body: MarkRead): Promise<number> {
  const query = trx
    .updateTable('notifications')
    .set({ read_at: sql<Date>`now()` })
    .where('workspace_id', '=', owner.workspaceId)
    .where('user_id', '=', owner.userId)
    .where('read_at', 'is', null);
  await ('ids' in body
    ? query.where('id', 'in', [...body.ids])
    : query.where('id', '<=', body.upTo)
  ).execute();
  return await unreadCount(trx, owner);
}

export function notificationMarkReadRoutes(): BoundRoute[] {
  return [
    bindRoute(notificationMarkReadRoute, async ({ params, body }, ctx) => {
      const owner = ownerOf(ctx, pathId('workspace', params.workspaceId));
      const marked = decoded(body);
      const unread = await ctx.tenant((trx) => markRead(trx, owner, marked));
      return { body: { unread } };
    }),
  ];
}
