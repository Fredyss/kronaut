import { randomUUID } from 'node:crypto';
import type { Database } from '@kronaut/db';
import { Hono } from 'hono';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import { purposeKey } from '../crypto.ts';
import type { AccessGate } from './access.ts';
import { DEFAULT_MAX_BODY_BYTES } from './body.ts';
import { type Kernel, pipeline } from './pipeline.ts';
import { routeRegistry } from './registry.ts';
import { failure } from './respond.ts';
import { createRouter } from './router.ts';
import type { BoundRoute } from './types.ts';
import type { WebApp } from './web.ts';

export { accessExempt } from './access-check.ts';
export { REVIEW_COOKIE } from './authenticate.ts';
export { routeRegistry } from './registry.ts';

export interface HttpKeys {
  readonly session: Uint8Array;
  readonly grant: Uint8Array;
  readonly reset: Uint8Array;
  readonly oauthPending: Uint8Array;
}

export function deriveHttpKeys(secret: Uint8Array): HttpKeys {
  return {
    session: purposeKey(secret, 'session-token/v1'),
    grant: purposeKey(secret, 'grant-token/v1'),
    reset: purposeKey(secret, 'reset-token/v1'),
    oauthPending: purposeKey(secret, 'oauth-pending/v1'),
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
}

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

export function createHttpApp(deps: HttpDeps, routes: readonly BoundRoute[]): Hono {
  routeRegistry(routes);
  const base = new URL(deps.publicBaseUrl);
  const kernel: Kernel = {
    deps,
    route: createRouter(routes),
    origin: base.origin,
    hsts: base.protocol === 'https:',
    maxBody: deps.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
  };

  const handle = async (request: Request): Promise<Response> => {
    const inbound = request.headers.get('x-request-id');
    const requestId = inbound !== null && REQUEST_ID.test(inbound) ? inbound : randomUUID();
    const logger = deps.logger.child({ requestId });
    try {
      return await pipeline(kernel, request, requestId, logger);
    } catch (err) {
      return failure(err, requestId, logger, kernel.hsts);
    }
  };

  const app = new Hono();
  app.all('*', (c) => handle(c.req.raw));
  app.onError((err) => {
    const requestId = randomUUID();
    return failure(err, requestId, deps.logger.child({ requestId }), kernel.hsts);
  });
  return app;
}
