import type { Route, RouteStatus } from '@kronaut/contract';
import type { Action, AuthorizeInputs, Decision, Principal, Resource } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import type { z } from 'zod';

type Parsed<S> = S extends z.ZodType ? z.output<S> : undefined;

export interface RouteInput<R extends Route> {
  readonly params: Parsed<R['params']>;
  readonly query: Parsed<R['query']>;
  readonly body: Parsed<R['body']>;
}

export interface SessionInfo {
  readonly sessionId: string;
  readonly userId: string;
  readonly reauthenticatedAt: Temporal.Instant;
}

export interface CookieOptions {
  readonly maxAgeSeconds: number;
}

export interface Via {
  readonly surface: 'mcp';
  readonly tool: string;
}

export interface RouteCall {
  readonly route: Route;
  readonly params: Readonly<Record<string, string>>;
  readonly body?: unknown;
  readonly idempotencyKey?: string;
  readonly idempotencyRetentionMs?: number;
  readonly via?: Via;
}

export interface RouteReply {
  readonly status: number;
  readonly body: unknown;
  readonly replayed: boolean;
  readonly retryAfterSeconds?: number;
}

export interface RequestContext {
  readonly requestId: string;
  readonly principal: Principal | null;
  readonly session: SessionInfo | null;
  readonly now: Temporal.Instant;
  readonly logger: Logger;
  readonly ipPrefix: string | null;
  readonly acceptLanguage: string | null;
  readonly via: Via | null;
  tenant<T>(fn: (db: TenantDb) => Promise<T>): Promise<T>;
  authorize(
    action: Action,
    resource: Resource,
    inputs?: Omit<AuthorizeInputs, 'now'>,
  ): Extract<Decision, { kind: 'allow' | 'allow_scoped' }>;
  cookie(name: string): string | undefined;
  setCookie(name: string, value: string, options: CookieOptions): void;
  clearCookie(name: string): void;
  header(name: string): string | null;
  dispatch(call: RouteCall): Promise<RouteReply>;
}

export interface RouteHeaders {
  readonly location?: string;
  readonly 'cache-control'?: string;
}

export interface RouteResult<R extends Route> {
  readonly status?: RouteStatus;
  readonly body: z.input<R['response']>;
  readonly headers?: RouteHeaders;
}

export type RouteHandler<R extends Route> = (
  input: RouteInput<R>,
  ctx: RequestContext,
) => Promise<RouteResult<R>>;

export interface BoundRoute<R extends Route = Route> {
  readonly route: R;
  readonly handler: RouteHandler<R>;
  readonly sameHost?: boolean;
  readonly challenge?: string;
}

export interface BindOptions {
  readonly sameHost?: boolean;
  readonly challenge?: string;
}

export function bindRoute<R extends Route>(
  route: R,
  handler: RouteHandler<R>,
  options: BindOptions = {},
): BoundRoute<R> {
  return {
    route,
    handler,
    ...(options.sameHost === true ? { sameHost: true } : {}),
    ...(options.challenge === undefined ? {} : { challenge: options.challenge }),
  };
}
