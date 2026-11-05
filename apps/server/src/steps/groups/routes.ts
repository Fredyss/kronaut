import { defineRoute } from '@kronaut/contract';
import { encodePublicId } from '@kronaut/core';
import * as z from 'zod';
import { pathId } from '../../base/http/params.ts';
import { type BoundRoute, bindRoute } from '../../base/http/request.ts';
import { addMember, type MemberRef, removeMember } from './members.ts';
import {
  createGroup,
  deleteGroup,
  type GroupRow,
  listGroups,
  NAME_MAX,
  renameGroup,
} from './store.ts';

const PATH = '/v1/workspaces/:workspaceId/groups';
const MEMBER_PATH = `${PATH}/:groupId/channels/:channelId`;

const WorkspaceParams = z.object({ workspaceId: z.string() });
const GroupParams = z.object({ workspaceId: z.string(), groupId: z.string() });
const MemberParams = GroupParams.extend({ channelId: z.string() });
const NameBody = z.strictObject({ name: z.string() });

const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  channelIds: z.array(z.string()),
});

const groupListRoute = defineRoute({
  id: 'groups.list',
  method: 'GET',
  path: PATH,
  auth: ['session', 'grant'],
  action: 'groups:read',
  params: WorkspaceParams,
  response: z.object({ items: z.array(GroupSchema) }),
  summary: 'List account groups',
  description:
    "The workspace's account groups by name, each with its channels in connection order. A restricted principal gets only the groups with a channel in its scope, and only those channels. Groups never grant access.",
  tags: ['groups'],
});

const groupCreateRoute = defineRoute({
  id: 'groups.create',
  method: 'POST',
  path: PATH,
  auth: 'session',
  action: 'groups:write',
  params: WorkspaceParams,
  body: NameBody,
  response: GroupSchema,
  status: 201,
  idempotency: true,
  summary: 'Create an account group',
  description: `The name is trimmed and has 1–${NAME_MAX} characters (422 name_invalid). A name that differs only in case from another group's is 409 group_name_taken. Owners and admins only.`,
  tags: ['groups'],
});

const groupUpdateRoute = defineRoute({
  id: 'groups.update',
  method: 'PATCH',
  path: `${PATH}/:groupId`,
  auth: 'session',
  action: 'groups:write',
  params: GroupParams,
  body: NameBody,
  response: GroupSchema,
  idempotency: true,
  summary: 'Rename an account group',
  description: 'The name follows the same rules as when creating a group. Owners and admins only.',
  tags: ['groups'],
});

const groupDeleteRoute = defineRoute({
  id: 'groups.delete',
  method: 'DELETE',
  path: `${PATH}/:groupId`,
  auth: 'session',
  action: 'groups:write',
  params: GroupParams,
  response: z.undefined(),
  status: 204,
  idempotency: true,
  summary: 'Delete an account group',
  description:
    'Removes the group and its memberships. Posts keep their destinations; those picked through the group lose the reference to it. Owners and admins only.',
  tags: ['groups'],
});

const memberAddRoute = defineRoute({
  id: 'groups.add_channel',
  method: 'PUT',
  path: MEMBER_PATH,
  auth: 'session',
  action: 'groups:write',
  params: MemberParams,
  response: z.undefined(),
  status: 204,
  idempotency: true,
  summary: 'Add a channel to an account group',
  description:
    'Idempotent. An unknown group or channel is 404. Existing posts are not changed. Owners and admins only.',
  tags: ['groups'],
});

const memberRemoveRoute = defineRoute({
  id: 'groups.remove_channel',
  method: 'DELETE',
  path: MEMBER_PATH,
  auth: 'session',
  action: 'groups:write',
  params: MemberParams,
  response: z.undefined(),
  status: 204,
  idempotency: true,
  summary: 'Remove a channel from an account group',
  description:
    'Idempotent. An unknown group or channel is 404. Existing posts are not changed. Owners and admins only.',
  tags: ['groups'],
});

function groupDto(row: GroupRow) {
  return GroupSchema.parse({
    id: encodePublicId('group', row.id),
    name: row.name,
    channelIds: row.channel_ids.map((id) => encodePublicId('socialAccount', id)),
  });
}

function groupRef(params: z.output<typeof GroupParams>) {
  return {
    workspaceId: pathId('workspace', params.workspaceId),
    groupId: pathId('group', params.groupId),
  };
}

function memberRef(params: z.output<typeof MemberParams>): MemberRef {
  return { ...groupRef(params), accountId: pathId('socialAccount', params.channelId) };
}

function memberRoutes(): BoundRoute[] {
  return [
    bindRoute(memberAddRoute, async ({ params }, ctx) => {
      const ref = memberRef(params);
      ctx.authorize('groups:write', { workspaceId: ref.workspaceId });
      await ctx.tenant((trx) => addMember(trx, ctx, ref));
      return { body: undefined };
    }),
    bindRoute(memberRemoveRoute, async ({ params }, ctx) => {
      const ref = memberRef(params);
      ctx.authorize('groups:write', { workspaceId: ref.workspaceId });
      await ctx.tenant((trx) => removeMember(trx, ctx, ref));
      return { body: undefined };
    }),
  ];
}

export function groupRoutes(): BoundRoute[] {
  return [
    bindRoute(groupListRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const decision = ctx.authorize('groups:read', { workspaceId });
      const scope = decision.kind === 'allow_scoped' ? decision.scope : null;
      const rows = await ctx.tenant((trx) => listGroups(trx, workspaceId, scope));
      return { body: { items: rows.map(groupDto) } };
    }),
    bindRoute(groupCreateRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('groups:write', { workspaceId });
      const row = await ctx.tenant((trx) => createGroup(trx, ctx, workspaceId, body));
      return { status: 201, body: groupDto(row) };
    }),
    bindRoute(groupUpdateRoute, async ({ params, body }, ctx) => {
      const ref = groupRef(params);
      ctx.authorize('groups:write', { workspaceId: ref.workspaceId });
      const row = await ctx.tenant((trx) => renameGroup(trx, ctx, ref, body));
      return { body: groupDto(row) };
    }),
    bindRoute(groupDeleteRoute, async ({ params }, ctx) => {
      const ref = groupRef(params);
      ctx.authorize('groups:write', { workspaceId: ref.workspaceId });
      await ctx.tenant((trx) => deleteGroup(trx, ctx, ref));
      return { body: undefined };
    }),
    ...memberRoutes(),
  ];
}
