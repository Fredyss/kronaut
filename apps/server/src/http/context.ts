import type { Route } from '@kronaut/contract';
import {
  type AccessScope,
  type AuthorizeInputs,
  authorize,
  type DenyCode,
  type Principal,
} from '@kronaut/core';
import type { Database, TenantDb } from '@kronaut/db';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import type { TenantTarget } from './bind.ts';
import { serializeCookie } from './cookies.ts';
import { databaseError, denyError, HttpError } from './errors.ts';
import type { RequestContext, SessionInfo } from './types.ts';

export interface RequestState {
  owed: boolean;
  shared: TenantDb | null;
}

export interface ContextInput {
  readonly db: Database;
  readonly route: Route;
  readonly requestId: string;
  readonly principal: Principal | null;
  readonly session: SessionInfo | null;
  readonly now: Temporal.Instant;
  readonly logger: Logger;
  readonly scopeInput: { readonly accessScope?: AccessScope };
  readonly target: TenantTarget | null;
  readonly cookies: ReadonlyMap<string, string>;
  readonly setCookies: string[];
  readonly state: RequestState;
  readonly acceptLanguage: string | null;
}

export function settle(state: RequestState, route: Route): void {
  if (state.owed) throw new Error(`route ${route.id} used the database before authorizing`);
}

const OWED_DENIALS: ReadonlySet<DenyCode> = new Set<DenyCode>(['out_of_scope', 'self_approval']);

export type Preauthorization = Pick<
  ContextInput,
  'route' | 'principal' | 'target' | 'now' | 'scopeInput'
>;

export function preauthorize(input: Preauthorization): boolean {
  const { route: bound, principal, target, now, scopeInput } = input;
  if (bound.action === null) return false;
  if (principal === null) {
    throw new Error(`route ${bound.id} reached authorization without a principal`);
  }
  const decision = authorize(
    principal,
    bound.action,
    target === null ? null : { workspaceId: target.workspaceId },
    { now, ...scopeInput },
  );
  // The route knows neither the units, the approval nor the requester yet; the handler must settle these.
  if (decision.kind === 'require_approval') return true;
  if (decision.kind === 'deny' && OWED_DENIALS.has(decision.code)) return true;
  if (decision.kind === 'deny') throw denyError(decision.code);
  return false;
}

export function createContext(input: ContextInput): RequestContext {
  const {
    db,
    route: bound,
    principal,
    now,
    scopeInput,
    target,
    cookies,
    setCookies,
    state,
  } = input;
  return {
    requestId: input.requestId,
    principal,
    session: input.session,
    now,
    logger: input.logger,
    ipPrefix: null,
    acceptLanguage: input.acceptLanguage,
    async tenant(fn) {
      const shared = state.shared;
      try {
        if (shared !== null) return await fn(shared);
        if (target === null) {
          throw new HttpError('internal', 'No workspace is bound to this request.');
        }
        return await db.withTenant(target.workspaceId, target.actor, async (trx) => {
          const result = await fn(trx);
          settle(state, bound);
          return result;
        });
      } catch (err) {
        const mapped = databaseError(err);
        if (mapped !== err) input.logger.warn({ err }, 'a database rule refused the request');
        throw mapped;
      }
    },
    authorize(action, resource, inputs = {}) {
      if (principal === null) {
        throw new HttpError('internal', 'No principal is bound to this request.');
      }
      const inputsWithNow: AuthorizeInputs = { ...scopeInput, ...inputs, now };
      const decision = authorize(principal, action, resource, inputsWithNow);
      if (decision.kind === 'deny') throw denyError(decision.code);
      if (decision.kind === 'require_approval') {
        throw new HttpError('approval_required', 'This action needs an approved request first.');
      }
      if (action === bound.action) state.owed = false;
      return decision;
    },
    cookie(name) {
      return cookies.get(name);
    },
    setCookie(name, value, options) {
      setCookies.push(serializeCookie(name, value, options));
    },
    clearCookie(name) {
      setCookies.push(serializeCookie(name, '', { maxAgeSeconds: 0 }));
    },
  };
}
