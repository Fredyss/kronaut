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

export const MCP_OUTPUT_LIMIT_BYTES = 512 * 1024;
const MCP_TOOL_TIMEOUT_MS = 30_000;

export interface Session {
  readonly tools: readonly Tool[];
  readonly scopes: readonly string[];
  readonly invoke: (tool: string) => Invoke;
  readonly grantId: string | null;
  readonly requestId: string;
  readonly logger: Logger;
  readonly timeoutMs?: number;
}

const SERVER_INFO = { name: 'kronaut', version: '1' };
const TIMED_OUT = Symbol('timed out');

interface Answer {
  readonly value: unknown;
  readonly isError: boolean;
}

function problem(session: Session, code: string, message: string): Answer {
  return { value: { error: { code, message, requestId: session.requestId } }, isError: true };
}

function result(session: Session, answer: Answer): CallToolResult {
  const text = JSON.stringify(answer.value);
  if (Buffer.byteLength(text, 'utf8') > MCP_OUTPUT_LIMIT_BYTES) {
    const message = `The tool result is larger than ${MCP_OUTPUT_LIMIT_BYTES} bytes.`;
    return result(session, problem(session, 'payload_too_large', message));
  }
  return {
    content: [{ type: 'text', text }],
    structuredContent: answer.value as Record<string, unknown>,
    ...(answer.isError ? { isError: true } : {}),
  };
}

async function withDeadline<T>(work: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  try {
    return await Promise.race([work, late]);
  } finally {
    clearTimeout(timer);
  }
}

async function answer(session: Session, tool: Tool, raw: unknown): Promise<Answer> {
  const parsed = tool.envelope.safeParse(raw ?? {});
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      path: ['arguments', ...issue.path].join('.'),
      code: issue.code,
    }));
    const invalid = problem(session, 'invalid_request', 'The tool arguments are invalid.');
    const body = invalid.value as { error: object };
    return { value: { error: { ...body.error, details } }, isError: true };
  }
  const work = runTool(tool, session.invoke(tool.name), toolArgs(tool, parsed.data));
  const reply = await withDeadline(work, session.timeoutMs ?? MCP_TOOL_TIMEOUT_MS);
  if (reply === TIMED_OUT) {
    const message = `The tool did not answer within ${session.timeoutMs ?? MCP_TOOL_TIMEOUT_MS} ms; it may still finish. Retry with the same idempotencyKey to get its result.`;
    return problem(session, 'unavailable', message);
  }
  if (reply.status >= 400) return { value: reply.body, isError: true };
  return { value: tool.present(reply.body) ?? {}, isError: false };
}

function codeOf(value: unknown): string | null {
  const error = (value as { error?: { code?: unknown } } | null)?.error;
  return typeof error?.code === 'string' ? error.code : null;
}

async function callTool(session: Session, tool: Tool, raw: unknown): Promise<CallToolResult> {
  const started = performance.now();
  let outcome: Answer;
  try {
    outcome = await answer(session, tool, raw);
  } catch (err) {
    session.logger.error({ err, tool: tool.name, grantId: session.grantId }, 'mcp tool failed');
    outcome = problem(session, 'internal', 'The tool failed.');
  }
  const called = result(session, outcome);
  session.logger.info(
    {
      tool: tool.name,
      grantId: session.grantId,
      outcome: called.isError === true ? 'error' : 'ok',
      errorCode: called.isError === true ? codeOf(called.structuredContent) : null,
      durationMs: Math.round(performance.now() - started),
    },
    'mcp tool call',
  );
  return called;
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
