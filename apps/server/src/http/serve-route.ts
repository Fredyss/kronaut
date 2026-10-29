import type { Route } from '@kronaut/contract';
import type { AccessScope, Principal } from '@kronaut/core';
import { authenticate } from './authenticate.ts';
import { bind, type TenantTarget, tenantOf } from './bind.ts';
import { createContext, preauthorize, type RequestState } from './context.ts';
import { parseCookies } from './cookies.ts';
import { type Execution, execute, type Outcome } from './execute.ts';
import { executeIdempotent } from './idempotent-run.ts';
import { parseInput, readLimited } from './input.ts';
import type { Inbound, Kernel } from './pipeline.ts';
import { headersFor, respond } from './respond.ts';
import type { RouteMatch } from './router.ts';
import { guardSession } from './session-guard.ts';
import type { SessionInfo } from './types.ts';

export interface FoundRequest extends Inbound {
  readonly matched: Extract<RouteMatch, { kind: 'found' }>;
  readonly raw: Uint8Array | null;
  readonly raised: number | undefined;
}

interface Authorized extends FoundRequest {
  readonly cookies: ReadonlyMap<string, string>;
  readonly principal: Principal | null;
  readonly session: SessionInfo | null;
  readonly scopeInput: { readonly accessScope?: AccessScope };
  readonly target: TenantTarget | null;
  readonly state: RequestState;
}

interface Prepared {
  readonly request: Request;
  readonly url: URL;
  readonly requestId: string;
  readonly now: Authorized['now'];
  readonly raw: Uint8Array;
  readonly target: TenantTarget | null;
  readonly setCookies: readonly string[];
  readonly execution: Execution;
}

export async function serveRoute(kernel: Kernel, req: FoundRequest): Promise<Response> {
  const { deps } = kernel;
  const { request, now, logger, matched } = req;
  const bound = matched.bound.route;
  const cookies = parseCookies(request.headers.get('cookie'));
  const candidates = await authenticate(deps, { route: bound, request, cookies, now, logger });
  const { authn, principal, accessScope, session } = await bind(
    deps.db,
    bound,
    matched.params,
    candidates,
  );
  if (authn.kind === 'session') await guardSession(deps.db, kernel.origin, authn.record, req);
  const scopeInput = accessScope === undefined ? {} : { accessScope };
  const target = tenantOf(principal);
  const owed = preauthorize({ route: bound, principal, target, now, scopeInput });
  const state: RequestState = { owed, shared: null };
  const authorized = { ...req, cookies, principal, session, scopeInput, target, state };
  return await finish(kernel, await prepare(kernel, authorized));
}

async function prepare(kernel: Kernel, req: Authorized): Promise<Prepared> {
  const { request, url, matched, state } = req;
  const bound: Route = matched.bound.route;
  const raw =
    req.raw ??
    (await readLimited(request, state.owed ? kernel.maxBody : (req.raised ?? kernel.maxBody)));
  const input = parseInput({
    route: bound,
    params: matched.params,
    search: url.searchParams,
    raw,
    contentType: request.headers.get('content-type'),
  });
  const setCookies: string[] = [];
  const ctx = createContext({
    db: kernel.deps.db,
    route: bound,
    requestId: req.requestId,
    principal: req.principal,
    session: req.session,
    now: req.now,
    logger: req.logger,
    scopeInput: req.scopeInput,
    target: req.target,
    cookies: req.cookies,
    setCookies,
    state,
    acceptLanguage: request.headers.get('accept-language'),
  });
  const execution: Execution = { bound: matched.bound, input, ctx, logger: req.logger, state };
  return { ...req, raw, setCookies, execution };
}

async function finish(kernel: Kernel, prepared: Prepared): Promise<Response> {
  const { execution, setCookies } = prepared;
  const headers = headersFor(prepared.requestId, kernel.hsts);
  let outcome: Outcome;
  if (execution.bound.route.idempotency) {
    const settled = await executeIdempotent({ db: kernel.deps.db, ...prepared });
    if (settled.replayed) {
      headers.set('Idempotent-Replayed', 'true');
      return respond(settled.status, settled.body, headers);
    }
    outcome = settled;
  } else {
    outcome = await execute(execution);
  }

  for (const cookie of setCookies) headers.append('Set-Cookie', cookie);
  for (const [name, value] of Object.entries(outcome.headers ?? {})) {
    if (value !== undefined) headers.set(name, value);
  }
  return respond(outcome.status, outcome.body, headers, execution.bound.route.responseEncoding);
}
