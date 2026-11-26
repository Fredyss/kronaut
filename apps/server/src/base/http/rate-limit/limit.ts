import type { GrantPrincipal, Principal } from '@kronaut/core';
import type { Database } from '@kronaut/db';
import { hmacToken } from '../../crypto/crypto.ts';
import { HttpError } from '../errors.ts';
import { ipSubject } from './client-ip.ts';
import { type Take, takeToken } from './token-bucket.ts';

export interface RateLimits {
  readonly grantPerMinute: number;
  readonly publicPerMinute: number;
}

export const DEFAULT_RATE_LIMITS: RateLimits = { grantPerMinute: 300, publicPerMinute: 30 };

const PROBES: ReadonlySet<string> = new Set(['system.health', 'system.ready']);
const IP_KEY_HEX = 32;
const OTHER_FAMILY = 'public';

// One bucket per family, so a burst on login can't starve a channel connect or a Meta deletion callback.
const ROUTE_FAMILIES: Readonly<Record<string, string>> = {
  'auth.login': 'auth',
  'auth.password_reset': 'auth',
  'channels.connect_callback': 'oauth',
  'oauth.public_document': 'oauth',
  'meta.deletion': 'meta',
  'meta.deauthorize': 'meta',
  'meta.deletion_status': 'meta',
};

export interface RateLimitDeps {
  readonly db: Database;
  readonly ipKey: Uint8Array;
  readonly limits: RateLimits;
}

export interface RateLimited {
  readonly routeId: string;
  readonly principal: Principal | null;
  readonly unauthenticated: boolean;
  readonly clientIp: string | null;
}

export function grantBucketKey(grantId: string): string {
  return `endpoint:grant:${grantId}`;
}

function ipBucketKey(ipKey: Uint8Array, routeId: string, clientIp: string): string {
  const family = ROUTE_FAMILIES[routeId] ?? OTHER_FAMILY;
  const digest = hmacToken(ipKey, ipSubject(clientIp)).toString('hex');
  return `endpoint:ip:${family}:${digest.slice(0, IP_KEY_HEX)}`;
}

function takeForGrant(deps: RateLimitDeps, grant: GrantPrincipal): Promise<Take> {
  const actor = { kind: 'grant', id: grant.grantId } as const;
  return deps.db.withTenant(grant.workspaceId, actor, async (trx) => {
    const row = await trx
      .selectFrom('access_grants')
      .select('rate_limit_per_min')
      .where('workspace_id', '=', grant.workspaceId)
      .where('id', '=', grant.grantId)
      .executeTakeFirst();
    const perMinute = row?.rate_limit_per_min ?? deps.limits.grantPerMinute;
    return await takeToken(trx, { key: grantBucketKey(grant.grantId), perMinute });
  });
}

function takeForIp(deps: RateLimitDeps, routeId: string, clientIp: string): Promise<Take> {
  const key = ipBucketKey(deps.ipKey, routeId, clientIp);
  const bucket = { key, perMinute: deps.limits.publicPerMinute };
  return deps.db.withActor({ kind: 'system' }, (trx) => takeToken(trx, bucket));
}

function take(deps: RateLimitDeps, req: RateLimited): Promise<Take> | null {
  if (req.principal?.kind === 'grant') return takeForGrant(deps, req.principal);
  if (!req.unauthenticated || req.clientIp === null || PROBES.has(req.routeId)) return null;
  return takeForIp(deps, req.routeId, req.clientIp);
}

export async function limitRate(deps: RateLimitDeps, req: RateLimited): Promise<void> {
  const taken = await take(deps, req);
  if (taken === null || taken.allowed) return;
  throw new HttpError('rate_limited', 'Too many requests. Try again later.', {
    retryAfterSeconds: taken.retryAfterSeconds,
  });
}
