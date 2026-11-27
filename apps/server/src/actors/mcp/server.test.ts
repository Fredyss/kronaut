import { defineRoute } from '@kronaut/contract';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import type { RouteReply } from '../../base/http/request.ts';
import { TOOL_DEFINITIONS } from './catalog.ts';
import { MCP_OUTPUT_LIMIT_BYTES, mcpServer } from './server.ts';
import { buildTool } from './tool.ts';

const metricsRoute = defineRoute({
  id: 'analytics.post_metrics',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/posts/:postId/metrics',
  auth: ['session', 'grant'],
  action: 'analytics:read',
  params: z.object({ workspaceId: z.string(), postId: z.string() }),
  response: z.object({ destinations: z.array(z.object({ destinationId: z.string() })) }),
  summary: 'Metrics',
});

const definition = TOOL_DEFINITIONS.find((tool) => tool.name === 'get_post_metrics');
if (definition === undefined) throw new Error('get_post_metrics is missing');
const tool = buildTool(definition, new Map([[metricsRoute.id, metricsRoute]]));

interface Called {
  readonly isError?: boolean;
  readonly content: readonly { readonly text: string }[];
  readonly structuredContent?: unknown;
}

interface ToolError {
  readonly error: { readonly code: string; readonly details?: unknown };
}

function errorOf(result: Called): ToolError['error'] {
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toBeUndefined();
  return (JSON.parse(result.content[0]?.text ?? '{}') as ToolError).error;
}

async function callWith(reply: () => Promise<RouteReply>, timeoutMs?: number): Promise<Called> {
  const server = mcpServer({
    tools: [tool],
    allows: (scope) => scope === 'analytics:read',
    invoke: () => reply,
    grantId: null,
    requestId: 'test-request',
    logger: pino({ level: 'silent' }),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
  });
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  const request = new Request('http://mcp.invalid/', {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      'mcp-protocol-version': '2025-06-18',
    },
  });
  const message = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'get_post_metrics', arguments: { postId: 'post_x' } },
  };
  const response = await transport.handleRequest(request, { parsedBody: message });
  await server.close();
  return ((await response.json()) as { result: Called }).result;
}

describe('mcp tool calls', () => {
  it('passes a result under the output cap', async () => {
    const result = await callWith(async () => ({
      status: 200,
      body: { destinations: [] },
      replayed: false,
    }));
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ destinations: [] });
  });

  it('builds the result from the output schema', async () => {
    const body = { destinations: [{ destinationId: 'd', extra: true }], more: 1 };
    const result = await callWith(async () => ({ status: 200, body, replayed: false }));
    expect(result.structuredContent).toEqual({ destinations: [{ destinationId: 'd' }] });
  });

  it('refuses a result over the output cap', async () => {
    const body = { destinations: [{ destinationId: 'x'.repeat(MCP_OUTPUT_LIMIT_BYTES) }] };
    const result = await callWith(async () => ({ status: 200, body, replayed: false }));
    expect(errorOf(result).code).toBe('payload_too_large');
  });

  it('answers unavailable when the route does not finish in time', async () => {
    const result = await callWith(() => new Promise<RouteReply>(() => {}), 20);
    expect(errorOf(result).code).toBe('unavailable');
  });

  it('passes a rate-limited route on with when to retry', async () => {
    const body = { error: { code: 'rate_limited', message: 'Slow down.', requestId: 'r' } };
    const result = await callWith(async () => ({
      status: 429,
      body,
      replayed: false,
      retryAfterSeconds: 7,
    }));
    expect(errorOf(result)).toMatchObject({
      code: 'rate_limited',
      details: { retryAfterSeconds: 7 },
    });
  });
});
