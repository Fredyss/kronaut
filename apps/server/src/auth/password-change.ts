import { defineRoute } from '@kronaut/contract';
import { SELF_ACTION } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import {
  type BoundRoute,
  bindRoute,
  type RequestContext,
  type SessionInfo,
} from '../http/types.ts';
import { recordEvent, requireSession } from './events.ts';
import { checkPassword, hashPassword } from './password.ts';
import {
  actorOf,
  LOCKED_OUT,
  lockSession,
  markReauthenticated,
  recordFailure,
  verifyCurrentPassword,
} from './reauth.ts';
import { type AuthDeps, LOGIN_PASSWORD_MAX_LENGTH } from './routes.ts';
import { revokeOtherSessions } from './session.ts';

export const passwordChangeRoute = defineRoute({
  id: 'auth.password_change',
  method: 'POST',
  path: '/v1/auth/password/change',
  auth: 'session',
  action: SELF_ACTION,
  body: z.object({
    currentPassword: z.string().min(1).max(LOGIN_PASSWORD_MAX_LENGTH),
    newPassword: z.string().max(LOGIN_PASSWORD_MAX_LENGTH),
  }),
  response: z.undefined(),
  status: 204,
  idempotency: false,
  summary: 'Change my password',
  description:
    'Sets a new password after checking the current one. Every other session of the user is signed out; this one stays and counts as just re-authenticated. Accounts with two-factor sign-in are refused (422 `two_factor_unavailable`) until a second-factor check exists. A wrong current password is 422 and counts towards the same five-failure lockout as re-authentication; the fifth revokes this session (401).',
  tags: ['auth'],
});

const TWO_FACTOR =
  'Changing the password is not available yet for accounts with two-factor sign-in.';

interface Passwords {
  readonly currentPassword: string;
  readonly newPassword: string;
}

type Outcome = 'changed' | 'incorrect' | 'two_factor_unavailable' | 'revoked';

function unprocessable(path: string, code: string, message: string): HttpError {
  return new HttpError('unprocessable', message, { details: [{ path, code }] });
}

async function setPassword(
  trx: TenantDb,
  ctx: RequestContext,
  session: SessionInfo,
  { stored, password }: { readonly stored: string; readonly password: string },
): Promise<void> {
  const updated = await trx
    .updateTable('users')
    .set({ password_hash: await hashPassword(password) })
    .where('id', '=', session.userId)
    .where('erased_at', 'is', null)
    .where(sql<boolean>`password_hash is not distinct from ${stored}`)
    .executeTakeFirst();
  if (updated.numUpdatedRows !== 1n) {
    throw new HttpError('conflict', 'The password was changed meanwhile: try again.');
  }
  await revokeOtherSessions(trx, session.userId, session.sessionId);
  await markReauthenticated(trx, session.sessionId);
  await recordEvent(trx, ctx, {
    kind: 'user.password_changed',
    userId: session.userId,
    detail: {},
  });
}

async function change(
  deps: AuthDeps,
  ctx: RequestContext,
  session: SessionInfo,
  body: Passwords,
): Promise<Outcome> {
  return await deps.db.withActor(actorOf(session), async (trx) => {
    await lockSession(trx, session);
    const { failure, stored } = await verifyCurrentPassword(trx, session, body.currentPassword);
    if (failure !== null || stored === null) {
      const twoFactor = failure === 'two_factor_unavailable';
      const reason = twoFactor ? failure : 'password_change';
      if (await recordFailure(trx, ctx, session, reason)) return 'revoked';
      return twoFactor ? failure : 'incorrect';
    }
    await setPassword(trx, ctx, session, { stored, password: body.newPassword });
    return 'changed';
  });
}

export function passwordChangeRoutes(deps: AuthDeps): BoundRoute[] {
  return [
    bindRoute(passwordChangeRoute, async ({ body }, ctx) => {
      const problem = checkPassword(body.newPassword);
      if (problem !== null) {
        throw unprocessable('body.newPassword', problem, 'The password does not meet the policy.');
      }
      const outcome = await change(deps, ctx, requireSession(ctx), body);
      if (outcome === 'revoked') throw new HttpError('unauthenticated', LOCKED_OUT);
      if (outcome === 'two_factor_unavailable') {
        throw unprocessable('body.currentPassword', outcome, TWO_FACTOR);
      }
      if (outcome === 'incorrect') {
        throw unprocessable('body.currentPassword', 'incorrect', 'The password is incorrect.');
      }
      return { body: undefined };
    }),
  ];
}
