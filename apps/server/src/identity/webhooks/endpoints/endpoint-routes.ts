import { defineRoute } from '@kronaut/contract';
import type { Keyring } from '@kronaut/credentials';
import * as z from 'zod';
import { HttpError } from '../../../base/http/errors.ts';
import { pathId } from '../../../base/http/params.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../../../base/http/request.ts';
import { DISABLE_AFTER_DAYS } from '../delivery/schedule.ts';
import {
  DESCRIPTION_MAX,
  endpointDescription,
  endpointEvents,
  endpointUrl,
  SUBSCRIBABLE,
  URL_MAX,
} from './input.ts';
import {
  createEndpoint,
  deleteEndpoint,
  type EndpointActor,
  PREVIOUS_SECRET_OVERLAP_HOURS,
  rotateSecret,
  updateEndpoint,
  type WithSecret,
} from './save.ts';
import {
  type EndpointRef,
  type EndpointRow,
  endpointDto,
  listEndpoints,
  WORKSPACE_MAX,
} from './store.ts';
import { sendTestEvent, TESTS_PER_HOUR } from './test-event.ts';

const PATH = '/v1/workspaces/:workspaceId/webhooks';
const ENDPOINT_PATH = `${PATH}/:webhookId`;

const WorkspaceParams = z.object({ workspaceId: z.string() });
const EndpointParams = z.object({ workspaceId: z.string(), webhookId: z.string() });
const Events = z.array(z.enum(SUBSCRIBABLE)).min(1).max(SUBSCRIBABLE.length);

const EndpointSchema = z.object({
  id: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  events: z.array(z.string()),
  enabled: z.boolean(),
  disabledReason: z.enum(['manual', 'failing']).nullable(),
  consecutiveFailures: z.number().int(),
  failingSince: z.iso.datetime().nullable(),
  previousSecretExpiresAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
const EndpointWithSecretSchema = EndpointSchema.extend({ secret: z.string() });

const RULES = `Owners and admins only, signed in; never an API key. The URL is an \`https\` link of up to ${URL_MAX} characters on port 443, with a host name and no credentials (422 url_invalid); every resolved address must be public when it is sent to. The description has at most ${DESCRIPTION_MAX} characters (422 description_invalid).`;
const SIGNING = `Deliveries follow Standard Webhooks: \`webhook-id\` (the event id, the same on every retry), \`webhook-timestamp\` and \`webhook-signature\` (\`v1,\` and a base64 HMAC-SHA256 of \`id.timestamp.body\` keyed with the base64 part of the secret).`;
const SECRET_ONCE =
  'The response is the only place the signing secret ever appears, so it is never replayed: a retry of this request runs it again.';

const listRoute = defineRoute({
  id: 'webhooks.list',
  method: 'GET',
  path: PATH,
  auth: 'session',
  action: 'webhooks:manage',
  params: WorkspaceParams,
  response: z.object({ items: z.array(EndpointSchema) }),
  summary: "List the workspace's webhook endpoints",
  description: `Oldest first. The signing secret is never listed. ${RULES}`,
  tags: ['webhooks'],
});

const createRoute = defineRoute({
  id: 'webhooks.create',
  method: 'POST',
  path: PATH,
  auth: 'session',
  action: 'webhooks:manage',
  params: WorkspaceParams,
  body: z.strictObject({
    url: z.string(),
    events: Events,
    description: z.string().nullable().optional(),
  }),
  response: EndpointWithSecretSchema,
  status: 201,
  idempotency: false,
  summary: 'Add a webhook endpoint',
  description: `The endpoint receives the events it subscribes to from now on. ${SIGNING} ${SECRET_ONCE} At most ${WORKSPACE_MAX} endpoints per workspace (409 webhook_limit). ${RULES}`,
  tags: ['webhooks'],
});

const updateRoute = defineRoute({
  id: 'webhooks.update',
  method: 'PATCH',
  path: ENDPOINT_PATH,
  auth: 'session',
  action: 'webhooks:manage',
  params: EndpointParams,
  body: z.strictObject({
    url: z.string().optional(),
    events: Events.optional(),
    description: z.string().nullable().optional(),
    enabled: z.boolean().optional(),
  }),
  response: EndpointSchema,
  idempotency: true,
  summary: 'Change, disable or enable a webhook endpoint',
  description: `Disabling stops new deliveries, and the endpoint's waiting ones end as dead. Enabling clears the failure count. An endpoint that has failed every delivery for ${DISABLE_AFTER_DAYS} days is disabled with reason \`failing\`. ${RULES}`,
  tags: ['webhooks'],
});

const rotateRoute = defineRoute({
  id: 'webhooks.rotate_secret',
  method: 'POST',
  path: `${ENDPOINT_PATH}/rotate-secret`,
  auth: 'session',
  action: 'webhooks:manage',
  params: EndpointParams,
  response: EndpointWithSecretSchema,
  idempotency: false,
  summary: "Rotate a webhook endpoint's signing secret",
  description: `For ${PREVIOUS_SECRET_OVERLAP_HOURS} hours each delivery carries two signatures, one with the new secret and one with the secret it replaced, so the receiver can switch over; rotating again replaces the previous secret. ${SECRET_ONCE} ${RULES}`,
  tags: ['webhooks'],
});

const deleteRoute = defineRoute({
  id: 'webhooks.delete',
  method: 'DELETE',
  path: ENDPOINT_PATH,
  auth: 'session',
  action: 'webhooks:manage',
  params: EndpointParams,
  response: z.undefined(),
  status: 204,
  idempotency: true,
  summary: 'Delete a webhook endpoint',
  description: `Its waiting deliveries go with it. ${RULES}`,
  tags: ['webhooks'],
});

const testRoute = defineRoute({
  id: 'webhooks.test',
  method: 'POST',
  path: `${ENDPOINT_PATH}/test`,
  auth: 'session',
  action: 'webhooks:manage',
  params: EndpointParams,
  response: z.object({ eventId: z.string() }),
  status: 202,
  idempotency: true,
  summary: 'Send a webhook.test event',
  description: `Queues one \`webhook.test\` event with empty \`data\` for this endpoint only, whatever it subscribes to; the worker sends it within a minute. \`eventId\` is the \`webhook-id\` the receiver sees. 409 endpoint_disabled for a disabled endpoint; at most ${TESTS_PER_HOUR} per endpoint per hour (429). ${RULES}`,
  tags: ['webhooks'],
});

function actorOf(keyring: Keyring, ctx: RequestContext, workspace: string): EndpointActor {
  const workspaceId = pathId('workspace', workspace);
  ctx.authorize('webhooks:manage', { workspaceId });
  if (ctx.session === null) throw new HttpError('internal', 'The route needs a session.');
  return { ctx, keyring, workspaceId, userId: ctx.session.userId };
}

function refOf(actor: EndpointActor, webhookId: string): EndpointRef {
  return { workspaceId: actor.workspaceId, endpointId: pathId('webhookEndpoint', webhookId) };
}

function withSecret(ctx: RequestContext, { row, secret }: WithSecret) {
  return EndpointWithSecretSchema.parse({ ...endpointDto(row, ctx.now), secret });
}

function bodyOf(ctx: RequestContext, row: EndpointRow) {
  return EndpointSchema.parse(endpointDto(row, ctx.now));
}

function optional<T, R>(value: T | undefined, map: (value: T) => R): R | undefined {
  return value === undefined ? undefined : map(value);
}

export function webhookRoutes({ keyring }: { readonly keyring: Keyring }): BoundRoute[] {
  return [
    bindRoute(listRoute, async ({ params }, ctx) => {
      const { workspaceId } = actorOf(keyring, ctx, params.workspaceId);
      const rows = await ctx.tenant((trx) => listEndpoints(trx, workspaceId));
      return { body: { items: rows.map((row) => bodyOf(ctx, row)) } };
    }),
    bindRoute(createRoute, async ({ params, body }, ctx) => {
      const actor = actorOf(keyring, ctx, params.workspaceId);
      const created = await createEndpoint(actor, {
        url: endpointUrl(body.url),
        events: endpointEvents(body.events),
        description: endpointDescription(body.description ?? null),
      });
      return { status: 201, body: withSecret(ctx, created) };
    }),
    bindRoute(updateRoute, async ({ params, body }, ctx) => {
      const actor = actorOf(keyring, ctx, params.workspaceId);
      const row = await updateEndpoint(actor, refOf(actor, params.webhookId), {
        url: optional(body.url, endpointUrl),
        events: optional(body.events, endpointEvents),
        description: optional(body.description, endpointDescription),
        enabled: body.enabled,
      });
      return { body: bodyOf(ctx, row) };
    }),
    bindRoute(rotateRoute, async ({ params }, ctx) => {
      const actor = actorOf(keyring, ctx, params.workspaceId);
      return { body: withSecret(ctx, await rotateSecret(actor, refOf(actor, params.webhookId))) };
    }),
    bindRoute(deleteRoute, async ({ params }, ctx) => {
      const actor = actorOf(keyring, ctx, params.workspaceId);
      await deleteEndpoint(actor, refOf(actor, params.webhookId));
      return { body: undefined };
    }),
    bindRoute(testRoute, async ({ params }, ctx) => {
      const actor = actorOf(keyring, ctx, params.workspaceId);
      const eventId = await sendTestEvent(actor, refOf(actor, params.webhookId));
      return { status: 202, body: { eventId } };
    }),
  ];
}
