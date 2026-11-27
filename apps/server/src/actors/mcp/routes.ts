import { defineRoute, type Route } from '@kronaut/contract';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import * as z from 'zod';
import { HttpError } from '../../base/http/errors.ts';
import { pathId } from '../../base/http/params.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../../base/http/request.ts';
import { catalog } from './catalog.ts';
import { TIMED_OUT, withDeadline } from './deadline.ts';
import { toolRights } from './rights.ts';
import { mcpServer } from './server.ts';
import { type Invoke, MCP_IDEMPOTENCY_RETENTION_MS } from './tool.ts';

const MCP_REQUEST_TIMEOUT_MS = 35_000;
const CHALLENGE = 'Bearer realm="kronaut"';
const Message = z.looseObject({ jsonrpc: z.literal('2.0') });
const LATE = `The MCP request did not finish within ${MCP_REQUEST_TIMEOUT_MS / 1000} s.`;
const TransportError = z.object({ error: z.object({ message: z.string().max(500) }) });

const mcpRoute = defineRoute({
  id: 'mcp.endpoint',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/mcp',
  auth: 'grant',
  action: 'posts:read',
  params: z.object({ workspaceId: z.string() }),
  body: Message,
  response: z.unknown(),
  idempotency: false,
  summary: 'Model Context Protocol endpoint for agents',
  description:
    'Streamable HTTP without sessions; every answer is JSON, and a request carries exactly one JSON-RPC message (no batches). Only an API key with posts:read signs in; a request without one gets 401 with WWW-Authenticate: Bearer realm="kronaut". tools/list shows the tools the key\'s scopes and its sponsor\'s current role both allow, and each tool runs its REST route with the same key, so scopes, resource access, approvals, rate limits and idempotency apply as on REST; MCP idempotency keys last 7 days. A request whose Host or Origin is not this server is refused with 403 before authentication. Each tool result is capped at 512 KiB, each tool call at 30 s and the whole request at 35 s.',
  tags: ['mcp'],
});

export interface McpRouteDeps {
  readonly routes: readonly Route[];
}

function invoker(ctx: RequestContext, workspaceId: string, routes: Map<string, Route>) {
  return (tool: string): Invoke =>
    (routeId, args) => {
      const route = routes.get(routeId);
      if (route === undefined) throw new Error(`mcp: no route ${routeId}`);
      return ctx.dispatch({
        route,
        params: { ...args.params, workspaceId },
        body: args.body,
        ...(args.idempotencyKey === undefined ? {} : { idempotencyKey: args.idempotencyKey }),
        idempotencyRetentionMs: MCP_IDEMPOTENCY_RETENTION_MS,
        via: { surface: 'mcp', tool },
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
  return [
    bindRoute(
      mcpRoute,
      async ({ params, body }, ctx) => {
        const workspaceId = pathId('workspace', params.workspaceId);
        ctx.authorize('posts:read', { workspaceId });
        const principal = ctx.principal;
        const server = mcpServer({
          tools,
          allows: toolRights(principal, workspaceId, ctx.now),
          grantId: principal?.kind === 'grant' ? principal.grantId : null,
          invoke: invoker(ctx, params.workspaceId, byId),
          requestId: ctx.requestId,
          logger: ctx.logger,
        });
        const transport = new WebStandardStreamableHTTPServerTransport({
          enableJsonResponse: true,
        });
        try {
          await server.connect(transport);
          const handled = transport.handleRequest(transportRequest(ctx), { parsedBody: body });
          const response = await withDeadline(handled, MCP_REQUEST_TIMEOUT_MS);
          if (response === TIMED_OUT) throw new HttpError('unavailable', LATE);
          return await answer(response);
        } finally {
          await server.close();
        }
      },
      { sameHost: true, challenge: CHALLENGE },
    ),
  ];
}
