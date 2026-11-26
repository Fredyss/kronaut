import { defineRoute } from '@kronaut/contract';
import { GRANTABLE_SCOPES } from '@kronaut/core';
import * as z from 'zod';
import { HttpError } from '../../../base/http/errors.ts';
import { pathId } from '../../../base/http/params.ts';
import { DEFAULT_RATE_LIMITS } from '../../../base/http/rate-limit/limit.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../../../base/http/request.ts';
import {
  ACCESS_MAX,
  grantAccess,
  grantExpiry,
  grantName,
  grantScopes,
  NAME_MAX,
  RATE_LIMIT_MAX,
} from './input.ts';
import { createGrant, type GrantActor, revokeGrant } from './save.ts';
import { grantDto, type ListedGrant, listGrants } from './store.ts';

const PATH = '/v1/workspaces/:workspaceId/grants';

const WorkspaceParams = z.object({ workspaceId: z.string() });
const GrantParams = z.object({ workspaceId: z.string(), grantId: z.string() });
const Ids = z.array(z.string()).max(ACCESS_MAX).default([]);

const AccessSchema = z.object({
  brandIds: z.array(z.string()),
  locationIds: z.array(z.string()),
  accountIds: z.array(z.string()),
});

const GrantSchema = z.object({
  id: z.string(),
  kind: z.enum(['api_key', 'oauth', 'internal_ai']),
  name: z.string(),
  status: z.enum(['active', 'expired', 'revoked']),
  scopes: z.array(z.string()),
  resourceScope: z.enum(['workspace', 'restricted']),
  access: AccessSchema.nullable(),
  tokenPrefix: z.string().nullable(),
  rateLimitPerMinute: z.number().int().nullable(),
  sponsorId: z.string(),
  expiresAt: z.iso.datetime().nullable(),
  revokedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
const CreatedSchema = GrantSchema.extend({ token: z.string() });

const RULES =
  'Owners and admins with access to the whole workspace only, signed in; never an API key.';
const LIMITS = `Each key gets its own rate limit: \`rateLimitPerMinute\` requests a minute (1 to ${RATE_LIMIT_MAX}), or ${DEFAULT_RATE_LIMITS.grantPerMinute} when unset; beyond it the API answers 429 with Retry-After.`;

const listRoute = defineRoute({
  id: 'grants.list',
  method: 'GET',
  path: PATH,
  auth: 'session',
  action: 'grants:manage',
  params: WorkspaceParams,
  response: z.object({ items: z.array(GrantSchema) }),
  summary: "List the workspace's API keys",
  description: `Newest first, revoked and expired keys included. The token is never listed; \`tokenPrefix\` names the key. ${RULES}`,
  tags: ['grants'],
});

const createRoute = defineRoute({
  id: 'grants.create',
  method: 'POST',
  path: PATH,
  auth: 'session',
  action: 'grants:manage',
  params: WorkspaceParams,
  body: z.strictObject({
    name: z.string().max(NAME_MAX * 4),
    scopes: z.array(z.string().max(64)).min(1).max(64),
    resourceScope: z.enum(['workspace', 'restricted']).default('workspace'),
    access: z.strictObject({ brandIds: Ids, locationIds: Ids, accountIds: Ids }).optional(),
    expiresAt: z.iso.datetime({ offset: true }).nullable().optional(),
    rateLimitPerMinute: z.number().int().min(1).max(RATE_LIMIT_MAX).nullable().optional(),
  }),
  response: CreatedSchema,
  status: 201,
  idempotency: false,
  summary: 'Create an API key',
  description: `The response is the only place the token \`kro_<key id>_<secret>\` ever appears; the server keeps only its HMAC, so the request is never replayed and a retry creates a second key. Send it as \`Authorization: Bearer <token>\`. Its rights are its scopes, cut to the sponsor's current role, evaluated on every request. Only the ${GRANTABLE_SCOPES.length} grantable scopes are accepted: a scope that can never be granted is 422 never_grantable, an unknown one 422 unknown_scope. A restricted key reaches only the brands, locations and channels in \`access\` (at most ${ACCESS_MAX} each), and nothing when they are empty; \`access\` on a workspace-wide key is 422 not_restricted. \`expiresAt\` must lie ahead (422 in_past). ${LIMITS} ${RULES}`,
  tags: ['grants'],
});

const revokeRoute = defineRoute({
  id: 'grants.revoke',
  method: 'POST',
  path: `${PATH}/:grantId/revoke`,
  auth: 'session',
  action: 'grants:manage',
  params: GrantParams,
  response: z.undefined(),
  status: 204,
  idempotency: true,
  summary: 'Revoke an API key',
  description: `The key stops working with the next request. Revoking a revoked key changes nothing. Series and evergreen posts it owns pause on their next step. ${RULES}`,
  tags: ['grants'],
});

function actorOf(grantKey: Uint8Array, ctx: RequestContext, workspace: string): GrantActor {
  const workspaceId = pathId('workspace', workspace);
  ctx.authorize('grants:manage', { workspaceId });
  if (ctx.session === null) throw new HttpError('internal', 'The route needs a session.');
  return { ctx, grantKey, workspaceId, userId: ctx.session.userId };
}

function bodyOf(ctx: RequestContext, grant: ListedGrant) {
  return GrantSchema.parse(grantDto(grant, ctx.now));
}

export function grantRoutes({ grantKey }: { readonly grantKey: Uint8Array }): BoundRoute[] {
  return [
    bindRoute(listRoute, async ({ params }, ctx) => {
      const { workspaceId } = actorOf(grantKey, ctx, params.workspaceId);
      const grants = await ctx.tenant((trx) => listGrants(trx, workspaceId));
      return { body: { items: grants.map((grant) => bodyOf(ctx, grant)) } };
    }),
    bindRoute(createRoute, async ({ params, body }, ctx) => {
      const actor = actorOf(grantKey, ctx, params.workspaceId);
      const restricted = body.resourceScope === 'restricted';
      const created = await createGrant(actor, {
        name: grantName(body.name),
        scopes: grantScopes(body.scopes),
        restricted,
        access: grantAccess(restricted, body.access),
        expiresAt: grantExpiry(body.expiresAt, ctx.now),
        rateLimitPerMinute: body.rateLimitPerMinute ?? null,
      });
      const dto = grantDto(created.grant, ctx.now);
      return { status: 201, body: CreatedSchema.parse({ ...dto, token: created.token }) };
    }),
    bindRoute(revokeRoute, async ({ params }, ctx) => {
      const actor = actorOf(grantKey, ctx, params.workspaceId);
      await revokeGrant(actor, pathId('grant', params.grantId));
      return { body: undefined };
    }),
  ];
}
