import { defineRoute } from '@kronaut/contract';
import * as z from 'zod';
import { HttpError } from '../../../base/http/errors.ts';
import { pathId } from '../../../base/http/params.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../../../base/http/request.ts';
import { clientIdValid, isSecretAppProvider } from '../../../base/providers/client-ids.ts';
import type { ProviderRegistry } from '../../../base/providers/providers.ts';
import type { ChannelRouteDeps } from '../deps.ts';
import {
  disableWorkspaceApp,
  registerWorkspaceApp,
  replaceWorkspaceAppSecret,
  type WorkspaceAppActor,
} from './save.ts';
import { listWorkspaceApps, type WorkspaceAppRow } from './store.ts';

const PATH = '/v1/workspaces/:workspaceId/provider-apps';
const SECRET = /^[\x21-\x7e]{1,512}$/;
const PROVIDER = /^[a-z0-9_]{2,32}$/;

const WorkspaceParams = z.object({ workspaceId: z.string() });
const ProviderParams = z.object({ workspaceId: z.string(), provider: z.string() });
const ClientSecret = z.string().trim().regex(SECRET);

const WorkspaceAppSchema = z.object({
  provider: z.string(),
  clientId: z.string(),
  status: z.enum(['active', 'misconfigured', 'disabled']),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const RULES =
  "The client secret is write-only and never returned. Only providers that allow a workspace's own app accept one (422 not_supported on body.provider); today that is x_com. Owners and admins only, never an API key.";

const listRoute = defineRoute({
  id: 'provider_apps.list',
  method: 'GET',
  path: PATH,
  auth: 'session',
  action: 'provider_apps:manage',
  params: WorkspaceParams,
  response: z.object({ items: z.array(WorkspaceAppSchema) }),
  summary: "List the workspace's own provider apps",
  description: `Newest first, disabled apps included. Instance-wide apps are not listed. ${RULES}`,
  tags: ['provider-apps'],
});

const registerRoute = defineRoute({
  id: 'provider_apps.register',
  method: 'POST',
  path: PATH,
  auth: 'session',
  action: 'provider_apps:manage',
  params: WorkspaceParams,
  body: z.strictObject({ provider: z.string(), clientId: z.string(), clientSecret: ClientSecret }),
  response: WorkspaceAppSchema,
  status: 201,
  idempotency: true,
  summary: "Register the workspace's own provider app",
  description: `New connects for the provider use this app instead of the instance app, so its owner pays the provider. Register \`/v1/oauth/<provider>/callback\` on this server as the app's redirect URI. One live app per provider (409 workspace_app_exists). Registering a client id this workspace disabled earlier reactivates that app with the new secret; a client id registered anywhere else on this server is refused (409 client_id_taken). The client id must match the provider's format (422 invalid on body.clientId). ${RULES}`,
  tags: ['provider-apps'],
});

const replaceSecretRoute = defineRoute({
  id: 'provider_apps.replace_secret',
  method: 'PUT',
  path: `${PATH}/:provider/secret`,
  auth: 'session',
  action: 'provider_apps:manage',
  params: ProviderParams,
  body: z.strictObject({ clientSecret: ClientSecret }),
  response: WorkspaceAppSchema,
  idempotency: true,
  summary: "Replace the client secret of the workspace's provider app",
  description: `Also marks a misconfigured app active again; until then, connects for the provider fail with app_config rather than use the instance app. 404 when the workspace has no live app for the provider. ${RULES}`,
  tags: ['provider-apps'],
});

const disableRoute = defineRoute({
  id: 'provider_apps.disable',
  method: 'POST',
  path: `${PATH}/:provider/disable`,
  auth: 'session',
  action: 'provider_apps:manage',
  params: ProviderParams,
  response: z.undefined(),
  status: 204,
  idempotency: true,
  summary: "Disable the workspace's provider app",
  description: `New connects use the instance app again, if there is one. Channels connected through the disabled app stop publishing and refreshing until they are reconnected. 404 when the workspace has no live app for the provider. ${RULES}`,
  tags: ['provider-apps'],
});

function itemOf(row: WorkspaceAppRow) {
  return WorkspaceAppSchema.parse({
    provider: row.provider,
    clientId: row.client_id,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  });
}

function actorOf(
  deps: ChannelRouteDeps,
  ctx: RequestContext,
  workspace: string,
): WorkspaceAppActor {
  const workspaceId = pathId('workspace', workspace);
  ctx.authorize('provider_apps:manage', { workspaceId });
  if (ctx.session === null) throw new HttpError('internal', 'The route needs a session.');
  return { ctx, keyring: deps.keyring, workspaceId, userId: ctx.session.userId };
}

function supportedProvider(providers: ProviderRegistry, provider: string, path: string): string {
  const entry = PROVIDER.test(provider) ? providers.get(provider) : undefined;
  if (entry?.manifest.workspaceApps !== true) {
    throw new HttpError('unprocessable', 'This provider does not take a workspace app.', {
      details: [{ path, code: 'not_supported' }],
    });
  }
  return provider;
}

function validClientId(provider: string, clientId: string): string {
  const trimmed = clientId.trim();
  if (!isSecretAppProvider(provider) || !clientIdValid(provider, trimmed)) {
    throw new HttpError('unprocessable', 'The client id does not match the provider.', {
      details: [{ path: 'body.clientId', code: 'invalid' }],
    });
  }
  return trimmed;
}

export function workspaceAppRoutes(deps: ChannelRouteDeps): BoundRoute[] {
  return [
    bindRoute(listRoute, async ({ params }, ctx) => {
      const { workspaceId } = actorOf(deps, ctx, params.workspaceId);
      const rows = await ctx.tenant((trx) => listWorkspaceApps(trx, workspaceId));
      return { body: { items: rows.map(itemOf) } };
    }),
    bindRoute(registerRoute, async ({ params, body }, ctx) => {
      const actor = actorOf(deps, ctx, params.workspaceId);
      const provider = supportedProvider(deps.providers, body.provider, 'body.provider');
      const clientId = validClientId(provider, body.clientId);
      const row = await registerWorkspaceApp(actor, {
        provider,
        clientId,
        clientSecret: body.clientSecret,
      });
      return { status: 201, body: itemOf(row) };
    }),
    bindRoute(replaceSecretRoute, async ({ params, body }, ctx) => {
      const actor = actorOf(deps, ctx, params.workspaceId);
      const provider = supportedProvider(deps.providers, params.provider, 'params.provider');
      const row = await replaceWorkspaceAppSecret(actor, provider, body.clientSecret);
      return { body: itemOf(row) };
    }),
    bindRoute(disableRoute, async ({ params }, ctx) => {
      const actor = actorOf(deps, ctx, params.workspaceId);
      const provider = supportedProvider(deps.providers, params.provider, 'params.provider');
      await disableWorkspaceApp(actor, provider);
      return { body: undefined };
    }),
  ];
}
