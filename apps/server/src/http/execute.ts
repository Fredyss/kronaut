import type { Route } from '@kronaut/contract';
import type { Logger } from 'pino';
import { type RequestState, settle } from './context.ts';
import { HttpError } from './errors.ts';
import { issueDetails } from './input.ts';
import type { BoundRoute, RequestContext, RouteHeaders, RouteInput } from './types.ts';

export interface Outcome {
  readonly status: number;
  readonly body: unknown;
  readonly headers?: RouteHeaders | undefined;
}

export interface Execution {
  readonly bound: BoundRoute;
  readonly input: RouteInput<Route>;
  readonly ctx: RequestContext;
  readonly logger: Logger;
  readonly state: RequestState;
}

const ROUTE_HEADERS: ReadonlySet<string> = new Set(['location', 'cache-control']);

function checkHeaders(bound: Route, extra: RouteHeaders | undefined): void {
  if (extra === undefined) return;
  if (bound.idempotency) throw new Error(`route ${bound.id}: idempotent replays drop headers`);
  for (const name of Object.keys(extra)) {
    if (!ROUTE_HEADERS.has(name)) throw new Error(`route ${bound.id}: header ${name}`);
  }
}

export async function execute(run: Execution): Promise<Outcome> {
  const bound = run.bound.route;
  const result = await run.bound.handler(run.input, run.ctx);
  settle(run.state, bound);
  const status = result.status ?? bound.status;
  const extra = result.headers;
  checkHeaders(bound, extra);
  if (status === 303) {
    if (extra?.location === undefined) throw new Error(`route ${bound.id}: 303 needs a location`);
    return { status, body: undefined, headers: extra };
  }
  if (status === 204) return { status, body: undefined, headers: extra };
  const parsed = bound.response.safeParse(result.body);
  if (!parsed.success) {
    run.logger.error(
      { routeId: bound.id, issues: issueDetails('response', parsed.error) },
      'response failed validation',
    );
    throw new HttpError('internal', 'The response failed validation.');
  }
  return { status, body: parsed.data, headers: extra };
}
