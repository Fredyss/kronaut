import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  type CallToolResult,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import type { Logger } from 'pino';
import type { RouteReply } from '../../base/http/request.ts';
import { TIMED_OUT, withDeadline } from './deadline.ts';
import type { Rights } from './rights.ts';
import { type Invoke, runTool, type Tool, toolArgs } from './tool.ts';

export const MCP_OUTPUT_LIMIT_BYTES = 512 * 1024;
const MCP_TOOL_TIMEOUT_MS = 30_000;

export interface Session {
  readonly tools: readonly Tool[];
  readonly allows: Rights;
  readonly invoke: (tool: string) => Invoke;
  readonly grantId: string | null;
  readonly requestId: string;
  readonly logger: Logger;
  readonly timeoutMs?: number;
}

const SERVER_INFO = { name: 'kronaut', version: '1' };

interface Answer {
  readonly value: Record<string, unknown>;
  readonly isError: boolean;
}

interface Problem {
  readonly details?: unknown;
}

function problem(session: Session, code: string, message: string, extra: Problem = {}): Answer {
  const error = { code, message, requestId: session.requestId, ...extra };
  return { value: { error }, isError: true };
}

function sized(session: Session, answer: Answer): Answer {
  const text = JSON.stringify(answer.value);
  if (Buffer.byteLength(text, 'utf8') <= MCP_OUTPUT_LIMIT_BYTES) return answer;
  const message = `The tool result is larger than ${MCP_OUTPUT_LIMIT_BYTES} bytes.`;
  return problem(session, 'payload_too_large', message);
}

// Clients check structuredContent against outputSchema even on an error, so an error is text only.
function result(answer: Answer): CallToolResult {
  const content = [{ type: 'text' as const, text: JSON.stringify(answer.value) }];
  if (answer.isError) return { content, isError: true };
  return { content, structuredContent: answer.value };
}

function failed(reply: RouteReply): Answer {
  const body = (reply.body ?? {}) as Record<string, unknown>;
  const error = body.error as Record<string, unknown> | undefined;
  if (error?.code !== 'rate_limited' || reply.retryAfterSeconds === undefined) {
    return { value: body, isError: true };
  }
  const details = { retryAfterSeconds: reply.retryAfterSeconds };
  return { value: { ...body, error: { ...error, details } }, isError: true };
}

async function answer(session: Session, tool: Tool, raw: unknown): Promise<Answer> {
  const parsed = tool.envelope.safeParse(raw ?? {});
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      path: ['arguments', ...issue.path].join('.'),
      code: issue.code,
    }));
    return problem(session, 'invalid_request', 'The tool arguments are invalid.', { details });
  }
  const timeoutMs = session.timeoutMs ?? MCP_TOOL_TIMEOUT_MS;
  const work = runTool(tool, session.invoke(tool.name), toolArgs(tool, parsed.data));
  const reply = await withDeadline(work, timeoutMs);
  if (reply === TIMED_OUT) {
    const message = `The tool did not answer within ${timeoutMs} ms; it may still finish. Retry with the same idempotencyKey to get its result.`;
    return problem(session, 'unavailable', message);
  }
  if (reply.status >= 400) return failed(reply);
  return { value: tool.result.parse(tool.present(reply.body)), isError: false };
}

function codeOf(answer: Answer): string | null {
  const error = answer.value.error as { code?: unknown } | undefined;
  return answer.isError && typeof error?.code === 'string' ? error.code : null;
}

async function callTool(session: Session, tool: Tool, raw: unknown): Promise<CallToolResult> {
  const started = performance.now();
  let outcome: Answer;
  try {
    outcome = sized(session, await answer(session, tool, raw));
  } catch (err) {
    session.logger.error({ err, tool: tool.name, grantId: session.grantId }, 'mcp tool failed');
    outcome = problem(session, 'internal', 'The tool failed.');
  }
  session.logger.info(
    {
      tool: tool.name,
      grantId: session.grantId,
      outcome: outcome.isError ? 'error' : 'ok',
      errorCode: codeOf(outcome),
      durationMs: Math.round(performance.now() - started),
    },
    'mcp tool call',
  );
  return result(outcome);
}

function listedTools(tools: readonly Tool[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema as { type: 'object' },
    outputSchema: tool.outputSchema as { type: 'object' },
    annotations: tool.annotations,
  }));
}

export function mcpServer(session: Session): Server {
  const visible = session.tools.filter((tool) => session.allows(tool.scope));
  const server = new Server(SERVER_INFO, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: listedTools(visible) }));
  server.setRequestHandler(CallToolRequestSchema, (request) => {
    const tool = visible.find((candidate) => candidate.name === request.params.name);
    if (tool === undefined) {
      throw new McpError(ErrorCode.InvalidParams, 'Unknown tool.');
    }
    return callTool(session, tool, request.params.arguments);
  });
  return server;
}
