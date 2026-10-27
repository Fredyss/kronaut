import { defineRoute } from '@kronaut/contract';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { pathId } from '../posts/params.ts';
import { EMAIL_GROUPS } from './groups.ts';
import { type Owner, ownerOf } from './owner.ts';

const PATH = '/v1/workspaces/:workspaceId/notification-preferences';
const WorkspaceParams = z.object({ workspaceId: z.string() });

const EmailPreferences = z.strictObject({
  failures: z.boolean(),
  approvals: z.boolean(),
  channels: z.boolean(),
});

const PreferencesSchema = z.strictObject({ email: EmailPreferences });

type Preferences = z.output<typeof PreferencesSchema>;

export const notificationPreferencesRoute = defineRoute({
  id: 'notifications.preferences',
  method: 'GET',
  path: PATH,
  auth: ['session'],
  action: 'posts:read',
  params: WorkspaceParams,
  response: PreferencesSchema,
  summary: 'Read my notification preferences',
  description:
    "The caller's own email preferences in this workspace, per group: failures (failed, unconfirmed and awaiting-manual destinations), approvals (approval requests and decisions) and channels (reconnect and expiry warnings). true means emailed; the default is true for every group. In-app notifications are always shown.",
  tags: ['notifications'],
});

export const notificationPreferencesUpdateRoute = defineRoute({
  id: 'notifications.preferences_update',
  method: 'PUT',
  path: PATH,
  auth: ['session'],
  action: 'posts:read',
  params: WorkspaceParams,
  body: PreferencesSchema,
  response: PreferencesSchema,
  idempotency: true,
  summary: 'Set my notification preferences',
  description:
    "Replaces the caller's own email preferences in this workspace; every group is required. A group set to false is no longer emailed, but its notifications still appear in-app. Returns the new preferences.",
  tags: ['notifications'],
});

function preferencesOf(muted: readonly string[]): Preferences {
  return {
    email: {
      failures: !muted.includes('failures'),
      approvals: !muted.includes('approvals'),
      channels: !muted.includes('channels'),
    },
  };
}

export async function readPreferences(trx: TenantDb, owner: Owner): Promise<Preferences> {
  const row = await trx
    .selectFrom('memberships')
    .select('email_muted')
    .where('workspace_id', '=', owner.workspaceId)
    .where('user_id', '=', owner.userId)
    .executeTakeFirstOrThrow();
  return preferencesOf(row.email_muted);
}

export async function writePreferences(
  trx: TenantDb,
  owner: Owner,
  body: Preferences,
): Promise<Preferences> {
  const muted = EMAIL_GROUPS.filter((group) => !body.email[group]);
  const row = await trx
    .updateTable('memberships')
    .set({ email_muted: muted, updated_at: sql<Date>`now()` })
    .where('workspace_id', '=', owner.workspaceId)
    .where('user_id', '=', owner.userId)
    .returning('email_muted')
    .executeTakeFirstOrThrow();
  return preferencesOf(row.email_muted);
}

export function notificationPreferenceRoutes(): BoundRoute[] {
  return [
    bindRoute(notificationPreferencesRoute, async ({ params }, ctx) => {
      const owner = ownerOf(ctx, pathId('workspace', params.workspaceId));
      return { body: await ctx.tenant((trx) => readPreferences(trx, owner)) };
    }),
    bindRoute(notificationPreferencesUpdateRoute, async ({ params, body }, ctx) => {
      const owner = ownerOf(ctx, pathId('workspace', params.workspaceId));
      return { body: await ctx.tenant((trx) => writePreferences(trx, owner, body)) };
    }),
  ];
}
