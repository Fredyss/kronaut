import { defineRoute, type Route } from '@kronaut/contract';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import * as z from 'zod';
import { HttpError } from '../../base/http/errors.ts';
import { pathId } from '../../base/http/params.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../../base/http/request.ts';
import { catalog } from './catalog.ts';
import { mcpServer } from './server.ts';
import { type Invoke, MCP_IDEMPOTENCY_RETENTION_MS } from './tool.ts';

const MAX_BATCH = 20;
const Message = z.looseObject({ jsonrpc: z.literal('2.0') });
const TransportError = z.object({ error: z.object({ message: z.string().max(500) }) });

const mcpRoute = defineRoute({
  id: 'mcp.endpoint',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/mcp',
  auth: 'grant',
  action: 'posts:read',
  params: z.object({ workspaceId: z.string() }),
  body: z.union([Message, z.array(Message).min(1).max(MAX_BATCH)]),
  response: z.unknown(),
  idempotency: false,
  summary: 'Model Context Protocol endpoint for agents',
  description:
    'Streamable HTTP without sessions; every answer is JSON. Only an API key with posts:read signs in. tools/list shows the tools the key has the scope for, and each tool runs its REST route with the same key, so scopes, resource access, approvals, rate limits and idempotency apply as on REST; MCP idempotency keys last 7 days. A request with an Origin header other than this server is refused.',
  tags: ['mcp'],
});

export interface McpRouteDeps {
  readonly routes: readonly Route[];
  readonly publicBaseUrl: string;
}

function invoker(ctx: RequestContext, workspaceId: string, routes: Map<string, Route>): Invoke {
  return (routeId, args) => {
    const route = routes.get(routeId);
    if (route === undefined) throw new Error(`mcp: no route ${routeId}`);
    return ctx.dispatch({
      route,
      params: { ...args.params, workspaceId },
      body: args.body,
      ...(args.idempotencyKey === undefined ? {} : { idempotencyKey: args.idempotencyKey }),
      idempotencyRetentionMs: MCP_IDEMPOTENCY_RETENTION_MS,
    });
  };
}

function transportRequest(ctx: RequestContext): Request {
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const name of ['accept', 'mcp-protocol-version']) {
    const value = ctx.header(name);
    if (value !== null) headers.set(name, value);
  }
  return new Request('http://mcp.invalid/', { method: 'POST', headers });
}

async function answer(response: Response) {
  const text = await response.text();
  if (response.status === 202) return { status: 202 as const, body: undefined };
  if (response.status === 200) return { body: JSON.parse(text) as unknown };
  const parsed = TransportError.safeParse(text === '' ? null : JSON.parse(text));
  const message = parsed.success ? parsed.data.error.message : 'The MCP request is invalid.';
  throw new HttpError('invalid_request', message, { status: response.status });
}

export function mcpRoutes(deps: McpRouteDeps): BoundRoute[] {
  const byId = new Map(deps.routes.map((route) => [route.id, route]));
  const tools = catalog(deps.routes);
  const origin = new URL(deps.publicBaseUrl).origin;
  return [
    bindRoute(mcpRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      ctx.authorize('posts:read', { workspaceId });
      const from = ctx.header('origin');
      if (from !== null && from !== origin) {
        throw new HttpError('forbidden', 'This origin may not use the MCP endpoint.');
      }
      const principal = ctx.principal;
      const server = mcpServer({
        tools,
        scopes: principal?.kind === 'grant' ? principal.scopes : [],
        invoke: invoker(ctx, params.workspaceId, byId),
        requestId: ctx.requestId,
        logger: ctx.logger,
      });
      const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
      try {
        await server.connect(transport);
        return await answer(
          await transport.handleRequest(transportRequest(ctx), { parsedBody: body }),
        );
      } finally {
        await server.close();
      }
    }),
  ];
}
