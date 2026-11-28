import { randomUUID } from 'node:crypto';
import type { Database } from '@kronaut/db';
import { Hono } from 'hono';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import type { authenticate } from '../../../identity/auth/authenticate.ts';
import type { guardSession } from '../../../identity/auth/session-guard.ts';
import { purposeKey } from '../../crypto/crypto.ts';
import { DEFAULT_MAX_BODY_BYTES } from '../body.ts';
import type { AccessGate } from '../caller/access.ts';
import { socketAddress } from '../rate-limit/client-ip.ts';
import type { RateLimits } from '../rate-limit/limit.ts';
import type { BoundRoute } from '../request.ts';
import type { WebApp } from '../web.ts';
import { type Arrival, type Kernel, pipeline } from './pipeline.ts';
import { routeRegistry } from './registry.ts';
import { failure } from './respond.ts';
import { createRouter } from './router.ts';

export { accessExempt } from '../caller/access-check.ts';
export { routeRegistry } from './registry.ts';

export interface HttpKeys {
  readonly session: Uint8Array;
  readonly grant: Uint8Array;
  readonly reset: Uint8Array;
  readonly oauthPending: Uint8Array;
  readonly metaSubject: Uint8Array;
  readonly rateIp: Uint8Array;
}

export function deriveHttpKeys(secret: Uint8Array): HttpKeys {
  return {
    session: purposeKey(secret, 'session-token/v1'),
    grant: purposeKey(secret, 'grant-token/v1'),
    reset: purposeKey(secret, 'reset-token/v1'),
    oauthPending: purposeKey(secret, 'oauth-pending/v1'),
    metaSubject: purposeKey(secret, 'meta-subject/v1'),
    rateIp: purposeKey(secret, 'rate-ip/v1'),
  };
}

export interface HttpDeps {
  readonly db: Database;
  readonly keys: HttpKeys;
  readonly logger: Logger;
  clock(): Temporal.Instant;
  readonly publicBaseUrl: string;
  readiness(): Promise<boolean>;
  readonly maxBodyBytes?: number;
  readonly routeBodyLimits?: Readonly<Record<string, number>>;
  readonly access?: AccessGate;
  readonly web?: WebApp;
  readonly instanceAdmins?: readonly string[];
  readonly rateLimits?: RateLimits;
  readonly trustCloudflareIp?: boolean;
  readonly authenticate: typeof authenticate;
  readonly guardSession: typeof guardSession;
}

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

export function createHttpApp(deps: HttpDeps, routes: readonly BoundRoute[]): Hono {
  routeRegistry(routes);
  const base = new URL(deps.publicBaseUrl);
  const serve = async (arrival: Arrival): Promise<Response> => {
    try {
      return await pipeline(kernel, arrival);
    } catch (err) {
      return failure(err, arrival.requestId, arrival.logger, kernel.hsts);
    }
  };
  const kernel: Kernel = {
    deps,
    route: createRouter(routes),
    origin: base.origin,
    hsts: base.protocol === 'https:',
    maxBody: deps.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
    reenter: serve,
  };

  const handle = (request: Request, socket: string | null): Promise<Response> => {
    const inbound = request.headers.get('x-request-id');
    const requestId = inbound !== null && REQUEST_ID.test(inbound) ? inbound : randomUUID();
    const logger = deps.logger.child({ requestId });
    return serve({ request, requestId, logger, socket });
  };

  const app = new Hono();
  app.all('*', (c) => handle(c.req.raw, socketAddress(c.env)));
  app.onError((err) => {
    const requestId = randomUUID();
    return failure(err, requestId, deps.logger.child({ requestId }), kernel.hsts);
  });
  return app;
}
