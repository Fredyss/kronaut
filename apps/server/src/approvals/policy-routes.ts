import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import { pathId } from '../posts/params.ts';
import { effectivePolicy } from './policy.ts';
import {
  ApprovalPolicySchema,
  deletePolicy,
  listPolicies,
  PolicyBody,
  type PolicyInput,
  PolicyValues,
  type PolicyWrite,
  requireBrand,
  savePolicy,
  valuesOf,
} from './policy-store.ts';

const PATH = '/v1/workspaces/:workspaceId/approval-policy';
const WorkspaceParams = z.object({ workspaceId: z.string() });
const BrandParams = z.object({ workspaceId: z.string(), brandId: z.string() });
const WRITE_NOTE =
  'Owners and admins only. Existing approval requests and destinations keep what they were bound to: a stricter policy applies when a destination is claimed, a looser one never approves anything by itself. A stale expectedVersion is 409.';

export const policyRoute = defineRoute({
  id: 'approvals.policy',
  method: 'GET',
  path: PATH,
  auth: ['session', 'grant'],
  action: 'posts:read',
  params: WorkspaceParams,
  response: z.object({
    workspace: ApprovalPolicySchema.nullable(),
    brands: z.array(ApprovalPolicySchema),
    effective: PolicyValues,
  }),
  summary: "Read the workspace's approval policy",
  description:
    'The workspace policy (null when there is none), the brand overrides, and the policy that applies to a post without a brand. With no workspace policy the strictest default applies: approval required, no self-approval, tolerance 0.',
  tags: ['approvals'],
});

export const policyUpdateRoute = defineRoute({
  id: 'approvals.policy_update',
  method: 'PUT',
  path: PATH,
  auth: ['session'],
  action: 'policy:write',
  params: WorkspaceParams,
  body: PolicyBody,
  response: ApprovalPolicySchema,
  idempotency: true,
  summary: "Set the workspace's approval policy",
  description: WRITE_NOTE,
  tags: ['approvals'],
});

export const brandPolicyUpdateRoute = defineRoute({
  id: 'approvals.brand_policy_update',
  method: 'PUT',
  path: `${PATH}/brands/:brandId`,
  auth: ['session'],
  action: 'policy:write',
  params: BrandParams,
  body: PolicyBody,
  response: ApprovalPolicySchema,
  idempotency: true,
  summary: "Set a brand's approval policy override",
  description: `${WRITE_NOTE} 404 when the brand is not in the workspace.`,
  tags: ['approvals'],
});

export const brandPolicyDeleteRoute = defineRoute({
  id: 'approvals.brand_policy_delete',
  method: 'DELETE',
  path: `${PATH}/brands/:brandId`,
  auth: ['session'],
  action: 'policy:write',
  params: BrandParams,
  response: z.undefined(),
  status: 204,
  idempotency: true,
  summary: "Remove a brand's approval policy override",
  description:
    "The brand's posts fall back to the workspace policy. Owners and admins only; 404 when the brand has no override.",
  tags: ['approvals'],
});

function brandWrite(params: z.output<typeof BrandParams>, action: string) {
  return {
    workspaceId: pathId('workspace', params.workspaceId),
    brandId: pathId('brand', params.brandId),
    action,
  };
}

function save(ctx: RequestContext, write: PolicyWrite, body: PolicyInput) {
  return ctx.tenant(async (trx) => {
    ctx.authorize('policy:write', { workspaceId: write.workspaceId });
    if (write.brandId !== null) await requireBrand(trx, write.workspaceId, write.brandId);
    return await savePolicy(trx, ctx, write, body);
  });
}

export function policyRoutes(): BoundRoute[] {
  return [
    bindRoute(policyRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const body = await ctx.tenant(async (trx) => {
        ctx.authorize('posts:read', { workspaceId });
        const stored = await listPolicies(trx, workspaceId);
        return { ...stored, effective: valuesOf(await effectivePolicy(trx, workspaceId, null)) };
      });
      return { body };
    }),
    bindRoute(policyUpdateRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const write = { workspaceId, brandId: null, action: policyUpdateRoute.id };
      return { body: await save(ctx, write, body) };
    }),
    bindRoute(brandPolicyUpdateRoute, async ({ params, body }, ctx) => {
      return { body: await save(ctx, brandWrite(params, brandPolicyUpdateRoute.id), body) };
    }),
    bindRoute(brandPolicyDeleteRoute, async ({ params }, ctx) => {
      const write = brandWrite(params, brandPolicyDeleteRoute.id);
      await ctx.tenant(async (trx) => {
        ctx.authorize('policy:write', { workspaceId: write.workspaceId });
        await requireBrand(trx, write.workspaceId, write.brandId);
        await deletePolicy(trx, ctx, write);
      });
      return { body: undefined };
    }),
  ];
}
