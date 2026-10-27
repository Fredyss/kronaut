import type { Route } from '@kronaut/contract';
import { type AccessScope, decodePublicId, type Principal } from '@kronaut/core';
import type { Database } from '@kronaut/db';
import type { Authn } from './authenticate.ts';
import { HttpError } from './errors.ts';
import { bindGrant, bindUser } from './principal.ts';
import { scoped } from './registry.ts';
import type { SessionInfo } from './types.ts';

export interface Binding {
  readonly authn: Authn;
  readonly principal: Principal | null;
  readonly accessScope: AccessScope | undefined;
  readonly session: SessionInfo | null;
}

export interface TenantTarget {
  readonly workspaceId: string;
  readonly actor: { readonly kind: 'user' | 'grant' | 'reviewer'; readonly id: string };
}

const NOT_FOUND = 'Not found.';

export function tenantOf(principal: Principal | null): TenantTarget | null {
  if (principal === null) return null;
  switch (principal.kind) {
    case 'user':
      return { workspaceId: principal.workspaceId, actor: { kind: 'user', id: principal.userId } };
    case 'grant':
      return {
        workspaceId: principal.workspaceId,
        actor: { kind: 'grant', id: principal.grantId },
      };
    case 'reviewer':
      return {
        workspaceId: principal.workspaceId,
        actor: { kind: 'reviewer', id: principal.reviewerId },
      };
    default:
      return null;
  }
}

async function bindSession(
  db: Database,
  workspaceId: string | undefined,
  authn: Extract<Authn, { kind: 'session' }>,
): Promise<Binding | null> {
  const { sessionId, userId, reauthenticatedAt } = authn.record;
  const session: SessionInfo = { sessionId, userId, reauthenticatedAt };
  if (workspaceId === undefined) {
    return { authn, principal: { kind: 'session', userId }, accessScope: undefined, session };
  }
  const result = await bindUser(db, workspaceId, session);
  if (result === null) return null;
  return { authn, principal: result.principal, accessScope: result.accessScope, session };
}

async function bindOne(
  db: Database,
  bound: Route,
  params: Readonly<Record<string, string>>,
  authn: Authn,
): Promise<Binding | null> {
  if (authn.kind === 'public') {
    return { authn, principal: null, accessScope: undefined, session: null };
  }
  const raw = scoped(bound) ? params.workspaceId : undefined;
  const workspaceId = raw === undefined ? undefined : decodePublicId('workspace', raw);
  if (workspaceId === null) return null;
  if (authn.kind === 'session') return bindSession(db, workspaceId, authn);
  if (workspaceId !== undefined && workspaceId !== authn.grant.workspaceId) return null;
  const result = await bindGrant(db, authn.grant);
  if (result === null) return null;
  return { authn, principal: result.principal, accessScope: result.accessScope, session: null };
}

export async function bind(
  db: Database,
  bound: Route,
  params: Readonly<Record<string, string>>,
  candidates: readonly Authn[],
): Promise<Binding> {
  for (const authn of candidates) {
    const binding = await bindOne(db, bound, params, authn);
    if (binding !== null) return binding;
  }
  throw new HttpError('not_found', NOT_FOUND);
}
