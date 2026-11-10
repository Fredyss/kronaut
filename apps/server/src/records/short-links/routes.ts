import { defineRoute } from '@kronaut/contract';
import type { Keyring } from '@kronaut/credentials';
import { createHttpClient, type HttpClient } from '@kronaut/egress';
import * as z from 'zod';
import { pathId } from '../../base/http/params.ts';
import { type BoundRoute, bindRoute } from '../../base/http/request.ts';
import { SHORTENER_EGRESS } from './api.ts';
import { API_KEY_MAX, BASE_URL_MAX, DOMAIN_MAX } from './input.ts';
import { bindPostShortLinks } from './post-links.ts';
import { connectShortener, removeShortener, updateShortener } from './save.ts';
import { DUB_BASE_URL, SHORTENER_PROVIDERS } from './shortener.ts';
import { loadShortener, type StoredShortener, shortenerDto } from './store.ts';

const PATH = '/v1/workspaces/:workspaceId/link-shortener';

const WorkspaceParams = z.object({ workspaceId: z.string() });

const ShortenerSchema = z.object({
  provider: z.enum(SHORTENER_PROVIDERS),
  baseUrl: z.string(),
  domain: z.string().nullable(),
  hasKey: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const KEY_RULES = `The API key is never returned (the response shows only hasKey). Saving checks the key with one read-only call: a refused key is 422 shortener_unauthorized, a shortener that can't be reached 422 shortener_unreachable. The base URL is \`${DUB_BASE_URL}\` for Dub; for Kutt it is required, an \`https\` link of up to ${BASE_URL_MAX} characters to \`https://kutt.to\` or your own instance, stored without \`/api/v2\` (422 base_url_invalid; \`kutt.it\` is refused). The domain is an optional custom short domain of up to ${DOMAIN_MAX} characters (422 domain_invalid). The key has up to ${API_KEY_MAX} printable characters (422 api_key_invalid). A new base URL needs the key again (422 api_key_required), so a stored key is never sent to another host. Owners and admins only.`;

const shortenerGetRoute = defineRoute({
  id: 'link_shortener.get',
  method: 'GET',
  path: PATH,
  auth: 'session',
  action: 'settings:write',
  params: WorkspaceParams,
  response: z.object({ shortener: ShortenerSchema.nullable() }),
  summary: "Read the workspace's link shortener",
  description: 'The connected shortener, or null when there is none. Owners and admins only.',
  tags: ['short-links'],
});

const shortenerConnectRoute = defineRoute({
  id: 'link_shortener.connect',
  method: 'POST',
  path: PATH,
  auth: 'session',
  action: 'settings:write',
  params: WorkspaceParams,
  body: z.strictObject({
    provider: z.enum(SHORTENER_PROVIDERS),
    baseUrl: z.string().optional(),
    domain: z.string().nullable().optional(),
    apiKey: z.string(),
  }),
  response: ShortenerSchema,
  status: 201,
  idempotency: true,
  summary: 'Connect a link shortener',
  description: `Links in posts frozen afterwards are shortened per channel, with UTM tags, when the post is sent. One shortener per workspace (409 conflict). ${KEY_RULES}`,
  tags: ['short-links'],
});

const shortenerUpdateRoute = defineRoute({
  id: 'link_shortener.update',
  method: 'PATCH',
  path: PATH,
  auth: 'session',
  action: 'settings:write',
  params: WorkspaceParams,
  body: z.strictObject({
    baseUrl: z.string().optional(),
    domain: z.string().nullable().optional(),
    apiKey: z.string().optional(),
  }),
  response: ShortenerSchema,
  idempotency: true,
  summary: 'Change the link shortener',
  description: `Changes the base URL, the domain or the key; a different provider needs removing and connecting again. 404 when there is none. ${KEY_RULES}`,
  tags: ['short-links'],
});

const shortenerRemoveRoute = defineRoute({
  id: 'link_shortener.remove',
  method: 'DELETE',
  path: PATH,
  auth: 'session',
  action: 'settings:write',
  params: WorkspaceParams,
  response: z.undefined(),
  status: 204,
  idempotency: true,
  summary: 'Remove the link shortener',
  description:
    'Posts frozen afterwards keep their long links; short links already created stay on the shortener. 404 when there is none. Owners and admins only.',
  tags: ['short-links'],
});

export interface ShortLinkRouteDeps {
  readonly keyring: Keyring;
  readonly http?: HttpClient | undefined;
}

function body(stored: StoredShortener) {
  return ShortenerSchema.parse(shortenerDto(stored));
}

export function shortLinkRoutes({
  keyring,
  http = createHttpClient(SHORTENER_EGRESS),
}: ShortLinkRouteDeps): BoundRoute[] {
  const deps = { keyring, http };
  return [
    bindRoute(shortenerGetRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('settings:write', { workspaceId });
      const stored = await ctx.tenant((trx) => loadShortener(trx, workspaceId));
      return { body: { shortener: stored === null ? null : body(stored) } };
    }),
    bindRoute(shortenerConnectRoute, async ({ params, body: input }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('settings:write', { workspaceId });
      return { status: 201, body: body(await connectShortener(ctx, deps, workspaceId, input)) };
    }),
    bindRoute(shortenerUpdateRoute, async ({ params, body: input }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('settings:write', { workspaceId });
      return { body: body(await updateShortener(ctx, deps, workspaceId, input)) };
    }),
    bindRoute(shortenerRemoveRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('settings:write', { workspaceId });
      await removeShortener(ctx, workspaceId);
      return { body: undefined };
    }),
    bindPostShortLinks(),
  ];
}
