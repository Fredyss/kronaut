import type { AuthMode, Route } from '@kronaut/contract';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import { bearerToken, findGrantToken, type GrantTokenRecord } from '../auth/grant.ts';
import { findSession, SESSION_COOKIE, type SessionRecord, sessionActive } from '../auth/session.ts';
import { HttpError } from './errors.ts';
import type { HttpDeps } from './kernel.ts';

export const REVIEW_COOKIE = '__Host-kronaut_review';

export type Authn =
  | { readonly kind: 'public' }
  | { readonly kind: 'session'; readonly record: SessionRecord }
  | { readonly kind: 'grant'; readonly grant: GrantTokenRecord };

export type AuthnDeps = Pick<HttpDeps, 'db' | 'keys'>;

export interface AuthnRequest {
  readonly route: Route;
  readonly request: Request;
  readonly cookies: ReadonlyMap<string, string>;
  readonly now: Temporal.Instant;
  readonly logger: Logger;
}

type Attempt = Authn | string | null;

async function trySession(deps: AuthnDeps, req: AuthnRequest): Promise<Attempt> {
  const token = req.cookies.get(SESSION_COOKIE);
  if (token === undefined) return null;
  const record = await findSession(deps.db, deps.keys.session, token);
  if (record !== null && sessionActive(record, req.now)) return { kind: 'session', record };
  return 'The session is invalid or has expired.';
}

async function tryGrant(deps: AuthnDeps, req: AuthnRequest): Promise<Attempt> {
  const header = req.request.headers.get('authorization');
  if (header === null) return null;
  const token = bearerToken(header);
  const grant = token === null ? null : await findGrantToken(deps.db, deps.keys.grant, token);
  if (grant !== null) return { kind: 'grant', grant };
  return 'The API key is invalid, expired or revoked.';
}

function tryMode(deps: AuthnDeps, mode: AuthMode, req: AuthnRequest): Promise<Attempt> {
  if (mode === 'session') return trySession(deps, req);
  if (mode === 'grant') return tryGrant(deps, req);
  if (req.cookies.has(REVIEW_COOKIE)) {
    req.logger.warn({ routeId: req.route.id }, 'review link sessions are not supported yet');
  }
  return Promise.resolve(null);
}

export async function authenticate(deps: AuthnDeps, req: AuthnRequest): Promise<Authn[]> {
  const found: Authn[] = [];
  let rejection: string | null = null;
  for (const mode of req.route.auth) {
    if (mode === 'public') {
      found.push({ kind: 'public' });
      break;
    }
    const attempt = await tryMode(deps, mode, req);
    if (attempt === null) continue;
    if (typeof attempt === 'string') rejection = attempt;
    else found.push(attempt);
  }
  if (found.length > 0) return found;
  throw new HttpError('unauthenticated', rejection ?? 'Authentication is required.');
}
