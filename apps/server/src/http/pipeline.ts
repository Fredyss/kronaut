import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import { checkAccess } from './access-check.ts';
import { errorBody, HttpError } from './errors.ts';
import { readLimited } from './input.ts';
import type { HttpDeps } from './kernel.ts';
import { headersFor, respond } from './respond.ts';
import type { RouteMatch } from './router.ts';
import { serveRoute } from './serve-route.ts';

export interface Kernel {
  readonly deps: HttpDeps;
  readonly route: (method: string, path: string) => RouteMatch;
  readonly origin: string;
  readonly hsts: boolean;
  readonly maxBody: number;
}

export interface Inbound {
  readonly request: Request;
  readonly url: URL;
  readonly requestId: string;
  readonly logger: Logger;
  readonly now: Temporal.Instant;
}

const NOT_FOUND = 'Not found.';

function serveWeb(kernel: Kernel, request: Request, requestId: string): Response | null {
  const web = kernel.deps.web;
  if (web === undefined) return null;
  const base = new Headers({ 'X-Request-Id': requestId });
  if (kernel.hsts) base.set('Strict-Transport-Security', 'max-age=31536000');
  return web.serve(request, base);
}

function methodNotAllowed(kernel: Kernel, allow: readonly string[], requestId: string): Response {
  const headers = headersFor(requestId, kernel.hsts);
  headers.set('Allow', allow.join(', '));
  const error = new HttpError('invalid_request', 'Method not allowed.', { status: 405 });
  return respond(405, errorBody(error, requestId), headers);
}

export async function pipeline(
  kernel: Kernel,
  request: Request,
  requestId: string,
  logger: Logger,
): Promise<Response> {
  const { deps } = kernel;
  const url = new URL(request.url);
  await checkAccess(deps.access, request, url, logger);
  const now = deps.clock();
  const matched = kernel.route(request.method, url.pathname);
  if (matched.kind === 'not_found') {
    const page = serveWeb(kernel, request, requestId);
    if (page !== null) return page;
  }
  const raised =
    matched.kind === 'found' ? deps.routeBodyLimits?.[matched.bound.route.id] : undefined;
  // A raised limit is buffered only for a caller the gate has fully allowed; an owed decision keeps the default
  const raw = raised === undefined ? await readLimited(request, kernel.maxBody) : null;
  if (matched.kind === 'not_found') throw new HttpError('not_found', NOT_FOUND);
  if (matched.kind === 'method_not_allowed') {
    return methodNotAllowed(kernel, matched.allow, requestId);
  }
  const inbound: Inbound = { request, url, requestId, logger, now };
  return await serveRoute(kernel, { ...inbound, matched, raw, raised });
}
