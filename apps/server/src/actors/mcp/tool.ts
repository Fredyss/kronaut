import { randomUUID } from 'node:crypto';
import type { Route } from '@kronaut/contract';
import { type GrantableScope, isGrantableScope } from '@kronaut/core';
import * as z from 'zod';
import type { RouteReply } from '../../base/http/request.ts';
import type { ResultOf, ResultSchema } from './results.ts';

export const MCP_IDEMPOTENCY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const IdempotencyKey = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,128}$/)
  .describe('Reuse the same key to retry safely; a different request with it is refused.');

export type Keyed = 'required' | 'generated' | 'none';

export interface ToolArgs {
  readonly params: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly idempotencyKey: string | undefined;
}

export type Invoke = (routeId: string, args: ToolArgs) => Promise<RouteReply>;

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly route: string;
  readonly keyed: Keyed;
  readonly readOnly: boolean;
  readonly destructive?: true;
  readonly run?: (invoke: Invoke, args: ToolArgs) => Promise<RouteReply>;
  readonly present: (body: unknown) => unknown;
  readonly output: ResultOf;
}

export interface Annotations {
  readonly readOnlyHint: boolean;
  readonly destructiveHint?: boolean;
  readonly idempotentHint?: boolean;
}

export interface Tool extends ToolDefinition {
  readonly scope: GrantableScope;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly result: ResultSchema;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly annotations: Annotations;
  readonly envelope: z.ZodType<Record<string, unknown>>;
  readonly paramNames: readonly string[];
}

function pathParams(route: Route): Record<string, z.ZodType> {
  const shape: Record<string, z.ZodType> = route.params?.shape ?? {};
  return Object.fromEntries(Object.entries(shape).filter(([name]) => name !== 'workspaceId'));
}

function inputShape(route: Route, keyed: Keyed): Record<string, z.ZodType> {
  return {
    ...pathParams(route),
    ...(route.body === undefined ? {} : { body: route.body }),
    ...(keyed === 'required' ? { idempotencyKey: IdempotencyKey } : {}),
    ...(keyed === 'generated' ? { idempotencyKey: IdempotencyKey.optional() } : {}),
  };
}

function envelopeShape(route: Route, keyed: Keyed): Record<string, z.ZodType> {
  const strings = Object.fromEntries(Object.keys(pathParams(route)).map((n) => [n, z.string()]));
  return {
    ...strings,
    ...(route.body === undefined ? {} : { body: z.unknown() }),
    ...(keyed === 'none' ? {} : { idempotencyKey: z.string().optional() }),
  };
}

function annotationsOf(definition: ToolDefinition): Annotations {
  if (definition.readOnly) return { readOnlyHint: true };
  return {
    readOnlyHint: false,
    destructiveHint: definition.destructive === true,
    idempotentHint: definition.keyed === 'required',
  };
}

const JSON_SCHEMA = { unrepresentable: 'any' } as const;

export function buildTool(definition: ToolDefinition, routes: ReadonlyMap<string, Route>): Tool {
  const route = routes.get(definition.route);
  if (route === undefined) {
    throw new Error(`mcp tool ${definition.name}: no route ${definition.route}`);
  }
  if (route.query !== undefined) {
    throw new Error(
      `mcp tool ${definition.name}: route ${route.id} takes a query, which tools do not pass yet`,
    );
  }
  const scope = route.action;
  if (scope === null || !isGrantableScope(scope)) {
    throw new Error(`mcp tool ${definition.name}: route ${route.id} is not open to API keys`);
  }
  const schema = z.strictObject(inputShape(route, definition.keyed));
  const result = definition.output(route.response);
  return {
    ...definition,
    scope,
    inputSchema: z.toJSONSchema(schema, { ...JSON_SCHEMA, io: 'input' }),
    result,
    outputSchema: z.toJSONSchema(result, { ...JSON_SCHEMA, io: 'output' }),
    annotations: annotationsOf(definition),
    envelope: z.strictObject(envelopeShape(route, definition.keyed)),
    paramNames: Object.keys(pathParams(route)),
  };
}

export function toolArgs(tool: Tool, parsed: Record<string, unknown>): ToolArgs {
  const params: Record<string, string> = {};
  for (const name of tool.paramNames) {
    const value = parsed[name];
    if (typeof value === 'string') params[name] = value;
  }
  const given = typeof parsed.idempotencyKey === 'string' ? parsed.idempotencyKey : undefined;
  const idempotencyKey = tool.keyed === 'generated' && given === undefined ? randomUUID() : given;
  return { params, body: parsed.body, idempotencyKey };
}

export function runTool(tool: Tool, invoke: Invoke, args: ToolArgs): Promise<RouteReply> {
  return tool.run === undefined ? invoke(tool.route, args) : tool.run(invoke, args);
}
