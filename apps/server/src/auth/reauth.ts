import { defineRoute } from '@kronaut/contract';
import { SELF_ACTION } from '@kronaut/core';
import type { Actor, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import {
  type BoundRoute,
  bindRoute,
  type RequestContext,
  type SessionInfo,
} from '../http/types.ts';
import { verifyPassword } from '../password.ts';
import { recordEvent, requireSession } from './events.ts';
import { SESSION_INVALID } from './profile.ts';
import { type AuthDeps, LOGIN_PASSWORD_MAX_LENGTH } from './routes.ts';
import { revokeSession } from './session.ts';

export const REAUTH_MAX_FAILURES = 5;

const WRONG_PASSWORD = 'The password is incorrect.';
export const LOCKED_OUT = 'Too many incorrect passwords: sign in again.';
const TWO_FACTOR = 'Confirming a session is not available for accounts with two-factor sign-in.';

export const reauthenticateRoute = defineRoute({
  id: 'auth.reauthenticate',
  method: 'POST',
  path: '/v1/auth/reauthenticate',
  auth: 'session',
  action: SELF_ACTION,
  body: z.object({ password: z.string().min(1).max(LOGIN_PASSWORD_MAX_LENGTH) }),
  response: z.object({ reauthenticatedAt: z.iso.datetime() }),
  idempotency: false,
  summary: 'Confirm the password for the current session',
  description:
    "Refreshes the session's re-authentication time, which approving needs within the last 12 h. The session token stays the same. Five wrong passwords since the last confirmation revoke the session.",
  tags: ['auth'],
});

type Failure = 'invalid_credentials' | 'two_factor_unavailable';

export type FailureReason = Failure | 'password_change';

export function actorOf(session: SessionInfo): Actor {
  return { kind: 'user', id: session.userId };
}

async function failuresSinceReauth(trx: TenantDb, session: SessionInfo): Promise<number> {
  const { n } = await trx
    .selectFrom('security_events')
    .select((eb) => eb.fn.countAll<string>().as('n'))
    .where('user_id', '=', session.userId)
    .where('kind', '=', 'auth.reauth_failed')
    .where(sql<string>`detail->>'session'`, '=', session.sessionId)
    .where('occurred_at', '>', (eb) =>
      eb.selectFrom('sessions').select('reauthenticated_at').where('id', '=', session.sessionId),
    )
    .executeTakeFirstOrThrow();
  return Number(n);
}

type Outcome =
  | { readonly kind: 'confirmed'; readonly at: Date }
  | { readonly kind: 'refused'; readonly reason: Failure; readonly revoked: boolean };

export async function recordFailure(
  trx: TenantDb,
  ctx: RequestContext,
  session: SessionInfo,
  reason: FailureReason,
): Promise<boolean> {
  await recordEvent(trx, ctx, {
    kind: 'auth.reauth_failed',
    userId: session.userId,
    detail: { session: session.sessionId, reason },
  });
  if ((await failuresSinceReauth(trx, session)) < REAUTH_MAX_FAILURES) return false;
  await revokeSession(trx, session.sessionId);
  return true;
}

export async function markReauthenticated(trx: TenantDb, sessionId: string): Promise<Date> {
  const row = await trx
    .updateTable('sessions')
    .set({ reauthenticated_at: sql<Date>`now()` })
    .where('id', '=', sessionId)
    .returning('reauthenticated_at')
    .executeTakeFirstOrThrow();
  return row.reauthenticated_at;
}

async function confirm(trx: TenantDb, ctx: RequestContext, session: SessionInfo): Promise<Date> {
  const at = await markReauthenticated(trx, session.sessionId);
  await recordEvent(trx, ctx, {
    kind: 'auth.reauthenticated',
    userId: session.userId,
    detail: { method: 'password' },
  });
  return at;
}

export interface CurrentPassword {
  readonly failure: Failure | null;
  readonly stored: string | null;
}

export async function verifyCurrentPassword(
  trx: TenantDb,
  session: SessionInfo,
  password: string,
): Promise<CurrentPassword> {
  const account = await trx
    .selectFrom('users')
    .select('password_hash')
    .select(sql<boolean>`totp_secret_ciphertext is not null`.as('totp_enabled'))
    .where('id', '=', session.userId)
    .where('erased_at', 'is', null)
    .executeTakeFirst();
  const stored = account?.password_hash ?? null;
  if (account?.totp_enabled === true) return { failure: 'two_factor_unavailable', stored };
  const verified = await verifyPassword(stored, password);
  return { failure: verified ? null : 'invalid_credentials', stored };
}

export async function lockSession(trx: TenantDb, session: SessionInfo): Promise<void> {
  // Holding the session row serialises attempts, so parallel guesses cannot outrun the lockout.
  const locked = await trx
    .selectFrom('sessions')
    .select('id')
    .where('id', '=', session.sessionId)
    .forUpdate()
    .executeTakeFirst();
  if (locked === undefined) throw new HttpError('unauthenticated', SESSION_INVALID);
}

async function attempt(
  deps: AuthDeps,
  ctx: RequestContext,
  session: SessionInfo,
  password: string,
): Promise<Outcome> {
  return await deps.db.withActor(actorOf(session), async (trx) => {
    await lockSession(trx, session);
    const { failure: reason } = await verifyCurrentPassword(trx, session, password);
    if (reason === null) return { kind: 'confirmed', at: await confirm(trx, ctx, session) };
    return { kind: 'refused', reason, revoked: await recordFailure(trx, ctx, session, reason) };
  });
}

function refusal({ reason, revoked }: Extract<Outcome, { kind: 'refused' }>): HttpError {
  if (revoked) return new HttpError('unauthenticated', LOCKED_OUT);
  return new HttpError(
    'unauthenticated',
    reason === 'invalid_credentials' ? WRONG_PASSWORD : TWO_FACTOR,
  );
}

export function reauthRoutes(deps: AuthDeps): BoundRoute[] {
  return [
    bindRoute(reauthenticateRoute, async ({ body }, ctx) => {
      const outcome = await attempt(deps, ctx, requireSession(ctx), body.password);
      if (outcome.kind === 'refused') throw refusal(outcome);
      return { body: { reauthenticatedAt: outcome.at.toISOString() } };
    }),
  ];
}
