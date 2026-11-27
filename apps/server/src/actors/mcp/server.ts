import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  type CallToolResult,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import type { Logger } from 'pino';
import { type Invoke, runTool, type Tool, toolArgs } from './tool.ts';

export interface Session {
  readonly tools: readonly Tool[];
  readonly scopes: readonly string[];
  readonly invoke: Invoke;
  readonly requestId: string;
  readonly logger: Logger;
}

const SERVER_INFO = { name: 'kronaut', version: '1' };

function result(value: unknown, isError: boolean): CallToolResult {
  const structured = value as Record<string, unknown>;
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: structured,
    ...(isError ? { isError: true } : {}),
  };
}

function problem(code: string, message: string, requestId: string) {
  return { error: { code, message, requestId } };
}

async function callTool(session: Session, tool: Tool, raw: unknown): Promise<CallToolResult> {
  const parsed = tool.envelope.safeParse(raw ?? {});
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      path: ['arguments', ...issue.path].join('.'),
      code: issue.code,
    }));
    const body = problem('invalid_request', 'The tool arguments are invalid.', session.requestId);
    return result({ error: { ...body.error, details } }, true);
  }
  try {
    const reply = await runTool(tool, session.invoke, toolArgs(tool, parsed.data));
    if (reply.status >= 400) return result(reply.body, true);
    return result(tool.present(reply.body) ?? {}, false);
  } catch (err) {
    session.logger.error({ err, tool: tool.name }, 'mcp tool failed');
    return result(problem('internal', 'The tool failed.', session.requestId), true);
  }
}

export function mcpServer(session: Session): Server {
  const visible = session.tools.filter((tool) => session.scopes.includes(tool.scope));
  const server = new Server(SERVER_INFO, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: visible.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as { type: 'object' },
      annotations: { readOnlyHint: tool.readOnly },
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, (request) => {
    const tool = visible.find((candidate) => candidate.name === request.params.name);
    if (tool === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'Unknown tool.');
    }
    return callTool(session, tool, request.params.arguments);
  });
  return server;
}
