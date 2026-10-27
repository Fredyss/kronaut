import { defineRoute } from '@kronaut/contract';
import { encodePublicId, SELF_ACTION } from '@kronaut/core';
import { sql } from 'kysely';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import type { HttpDeps } from '../http/kernel.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { checkPassword, hashPassword, verifyPassword } from '../password.ts';
import { recordEvent, requireSession } from './events.ts';
import { readUser, SESSION_INVALID, UserSchema } from './profile.ts';
import { passwordBinding, RESET_TOKEN_MAX_LENGTH, verifyResetToken } from './reset-token.ts';
import {
  createSession,
  revokeAllSessions,
  revokeSession,
  SESSION_ABSOLUTE_MS,
  SESSION_COOKIE,
} from './session.ts';

export const EMAIL_MAX_LENGTH = 320;
export const LOGIN_PASSWORD_MAX_LENGTH = 1024;

const INVALID_CREDENTIALS = 'The email or password is incorrect.';
const INVALID_RESET_LINK = 'The link is invalid or has expired.';

interface LoginRow {
  user_id: string;
  password_hash: string | null;
  totp_enabled: boolean;
}

interface WorkspaceRow {
  workspace_id: string;
  organization_id: string;
  name: string;
  role: string;
  can_approve: boolean;
}

export function normalizeEmail(email: string): string {
  return email.trim().normalize('NFC').toLowerCase();
}

export const loginRoute = defineRoute({
  id: 'auth.login',
  method: 'POST',
  path: '/v1/auth/login',
  auth: 'public',
  action: null,
  body: z.object({
    email: z.string().trim().min(1).max(EMAIL_MAX_LENGTH),
    password: z.string().min(1).max(LOGIN_PASSWORD_MAX_LENGTH),
  }),
  response: z.object({ userId: z.string() }),
  summary: 'Sign in with email and password',
  tags: ['auth'],
});

export const logoutRoute = defineRoute({
  id: 'auth.logout',
  method: 'POST',
  path: '/v1/auth/logout',
  auth: 'session',
  action: SELF_ACTION,
  response: z.undefined(),
  status: 204,
  idempotency: false,
  summary: 'Sign out of the current session',
  tags: ['auth'],
});

export const passwordResetRoute = defineRoute({
  id: 'auth.password_reset',
  method: 'POST',
  path: '/v1/auth/password',
  auth: 'public',
  action: null,
  body: z.object({
    token: z.string().max(RESET_TOKEN_MAX_LENGTH),
    password: z.string().max(LOGIN_PASSWORD_MAX_LENGTH),
  }),
  response: z.undefined(),
  status: 204,
  summary: 'Set a new password with a one-time link',
  tags: ['auth'],
});

export const meRoute = defineRoute({
  id: 'auth.me',
  method: 'GET',
  path: '/v1/me',
  auth: 'session',
  action: SELF_ACTION,
  response: z.object({
    user: UserSchema,
    workspaces: z.array(
      z.object({ id: z.string(), name: z.string(), role: z.string(), canApprove: z.boolean() }),
    ),
  }),
  summary: 'The signed-in user and their workspaces',
  tags: ['auth'],
});

export type AuthDeps = Pick<HttpDeps, 'db' | 'keys'>;

function bindLogin(deps: AuthDeps) {
  return bindRoute(loginRoute, async ({ body }, ctx) => {
    const email = normalizeEmail(body.email);
    const account = await deps.db.withActor({ kind: 'system' }, async (trx) => {
      const result = await sql<LoginRow>`select * from auth_login_lookup(${email})`.execute(trx);
      return result.rows[0];
    });
    const verified = await verifyPassword(account?.password_hash ?? null, body.password);
    if (account === undefined || !verified || account.totp_enabled) {
      const reason = verified ? 'two_factor_unavailable' : 'invalid_credentials';
      await deps.db.withActor({ kind: 'system' }, (trx) =>
        recordEvent(trx, ctx, {
          kind: 'auth.login_failed',
          userId: account?.user_id ?? null,
          detail: { reason },
        }),
      );
      throw new HttpError('unauthenticated', INVALID_CREDENTIALS);
    }
    const userId = account.user_id;
    const created = await deps.db.withActor({ kind: 'user', id: userId }, async (trx) => {
      const session = await createSession(trx, deps.keys.session, userId, ctx.now);
      await recordEvent(trx, ctx, {
        kind: 'auth.login_succeeded',
        userId,
        detail: { method: 'password' },
      });
      return session;
    });
    ctx.setCookie(SESSION_COOKIE, created.token, { maxAgeSeconds: SESSION_ABSOLUTE_MS / 1000 });
    return { body: { userId: encodePublicId('user', userId) } };
  });
}

function bindLogout(deps: AuthDeps) {
  return bindRoute(logoutRoute, async (_input, ctx) => {
    const session = requireSession(ctx);
    await deps.db.withActor({ kind: 'user', id: session.userId }, (trx) =>
      revokeSession(trx, session.sessionId),
    );
    ctx.clearCookie(SESSION_COOKIE);
    return { body: undefined };
  });
}

function bindPasswordReset(deps: AuthDeps) {
  return bindRoute(passwordResetRoute, async ({ body }, ctx) => {
    const verified = verifyResetToken(deps.keys.reset, body.token, ctx.now);
    if (verified === null) throw new HttpError('invalid_request', INVALID_RESET_LINK);
    const { userId } = verified;
    await deps.db.withActor({ kind: 'user', id: userId }, async (trx) => {
      const user = await trx
        .selectFrom('users')
        .select('password_hash')
        .where('id', '=', userId)
        .where('erased_at', 'is', null)
        .executeTakeFirst();
      if (user === undefined || !passwordBinding(user.password_hash).equals(verified.binding)) {
        throw new HttpError('invalid_request', INVALID_RESET_LINK);
      }
      const problem = checkPassword(body.password);
      if (problem !== null) {
        throw new HttpError('unprocessable', 'The password does not meet the policy.', {
          details: [{ path: 'password', code: problem }],
        });
      }
      const updated = await trx
        .updateTable('users')
        .set({ password_hash: await hashPassword(body.password) })
        .where('id', '=', userId)
        .where('erased_at', 'is', null)
        .where(sql<boolean>`password_hash is not distinct from ${user.password_hash}`)
        .executeTakeFirst();
      if (updated.numUpdatedRows !== 1n) {
        throw new HttpError('invalid_request', INVALID_RESET_LINK);
      }
      await revokeAllSessions(trx, userId);
      await recordEvent(trx, ctx, { kind: 'user.password_reset', userId, detail: {} });
    });
    return { body: undefined };
  });
}

function bindMe(deps: AuthDeps) {
  return bindRoute(meRoute, async (_input, ctx) => {
    const session = requireSession(ctx);
    const { user, workspaces } = await deps.db.withActor(
      { kind: 'user', id: session.userId },
      async (trx) => {
        const row = await readUser(trx, session.userId);
        const result = await sql<WorkspaceRow>`
          select * from auth_user_workspaces(${session.userId})
        `.execute(trx);
        return { user: row, workspaces: result.rows };
      },
    );
    if (user === undefined) {
      throw new HttpError('unauthenticated', SESSION_INVALID);
    }
    const sorted = [...workspaces].sort(
      (a, b) => a.name.localeCompare(b.name, 'en') || (a.workspace_id < b.workspace_id ? -1 : 1),
    );
    return {
      body: {
        user,
        workspaces: sorted.map((w) => ({
          id: encodePublicId('workspace', w.workspace_id),
          name: w.name,
          role: w.role,
          canApprove: w.can_approve,
        })),
      },
    };
  });
}

export function authRoutes(deps: AuthDeps): BoundRoute[] {
  return [bindLogin(deps), bindLogout(deps), bindPasswordReset(deps), bindMe(deps)];
}
