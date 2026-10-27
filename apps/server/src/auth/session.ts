import type { Database, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { hmacToken, randomToken, TOKEN_PREFIX } from '../crypto.ts';

export const SESSION_COOKIE = '__Host-kronaut_session';
export const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_SLIDE_INTERVAL_MS = 60 * 60 * 1000;

const SESSION_TOKEN = /^kro_sess_[A-Za-z0-9_-]{43}$/;

export interface CreatedSession {
  readonly sessionId: string;
  readonly token: string;
  readonly expiresAt: Temporal.Instant;
}

export interface SessionRecord {
  readonly sessionId: string;
  readonly userId: string;
  readonly expiresAt: Temporal.Instant;
  readonly idleExpiresAt: Temporal.Instant;
  readonly reauthenticatedAt: Temporal.Instant;
}

interface SessionRow {
  session_id: string;
  user_id: string;
  expires_at: Date;
  idle_expires_at: Date;
  reauthenticated_at: Date;
}

function instant(date: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

function later(a: Temporal.Instant, b: Temporal.Instant): boolean {
  return Temporal.Instant.compare(a, b) > 0;
}

export function isSessionToken(value: string): boolean {
  return SESSION_TOKEN.test(value);
}

export function hashSessionToken(key: Uint8Array, token: string): Buffer {
  return hmacToken(key, token);
}

export async function createSession(
  db: TenantDb,
  key: Uint8Array,
  userId: string,
  now: Temporal.Instant,
): Promise<CreatedSession> {
  const token = randomToken(TOKEN_PREFIX.session);
  const expiresAt = now.add({ milliseconds: SESSION_ABSOLUTE_MS });
  const row = await db
    .insertInto('sessions')
    .values({
      token_hash: hashSessionToken(key, token),
      user_id: userId,
      expires_at: expiresAt.toString(),
      idle_expires_at: now.add({ milliseconds: SESSION_IDLE_MS }).toString(),
      reauthenticated_at: now.toString(),
    })
    .returning('id')
    .executeTakeFirstOrThrow();
  return { sessionId: row.id, token, expiresAt };
}

export async function findSession(
  db: Database,
  key: Uint8Array,
  token: string,
): Promise<SessionRecord | null> {
  if (!isSessionToken(token)) return null;
  const hash = hashSessionToken(key, token);
  const result = await db.withActor({ kind: 'system' }, (trx) =>
    sql<SessionRow>`select * from auth_lookup_session(${hash})`.execute(trx),
  );
  const row = result.rows[0];
  if (row === undefined) return null;
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    expiresAt: instant(row.expires_at),
    idleExpiresAt: instant(row.idle_expires_at),
    reauthenticatedAt: instant(row.reauthenticated_at),
  };
}

export function sessionActive(session: SessionRecord, now: Temporal.Instant): boolean {
  return later(session.expiresAt, now) && later(session.idleExpiresAt, now);
}

export function slideTarget(
  session: SessionRecord,
  now: Temporal.Instant,
): Temporal.Instant | null {
  const wanted = now.add({ milliseconds: SESSION_IDLE_MS });
  const target = later(wanted, session.expiresAt) ? session.expiresAt : wanted;
  const gain = target.epochMilliseconds - session.idleExpiresAt.epochMilliseconds;
  return gain >= SESSION_SLIDE_INTERVAL_MS ? target : null;
}

export async function slideSession(
  db: Database,
  session: SessionRecord,
  now: Temporal.Instant,
): Promise<void> {
  const target = slideTarget(session, now);
  if (target === null) return;
  await db.withActor({ kind: 'user', id: session.userId }, (trx) =>
    trx
      .updateTable('sessions')
      .set({ idle_expires_at: target.toString() })
      .where('id', '=', session.sessionId)
      .execute(),
  );
}

export async function revokeSession(db: TenantDb, sessionId: string): Promise<void> {
  await db.deleteFrom('sessions').where('id', '=', sessionId).execute();
}

export async function revokeAllSessions(db: TenantDb, userId: string): Promise<number> {
  const result = await db.deleteFrom('sessions').where('user_id', '=', userId).executeTakeFirst();
  return Number(result.numDeletedRows);
}

export async function revokeOtherSessions(
  db: TenantDb,
  userId: string,
  keepSessionId: string,
): Promise<number> {
  const result = await db
    .deleteFrom('sessions')
    .where('user_id', '=', userId)
    .where('id', '<>', keepSessionId)
    .executeTakeFirst();
  return Number(result.numDeletedRows);
}
