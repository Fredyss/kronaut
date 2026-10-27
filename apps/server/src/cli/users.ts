import { actorSetting, type Database, type TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { issueResetToken } from '../auth/reset-token.ts';
import { EMAIL_MAX_LENGTH, normalizeEmail } from '../auth/routes.ts';
import { revokeAllSessions } from '../auth/session.ts';
import { CommandError, UsageError } from './errors.ts';

export interface UserCommandDeps {
  readonly db: Database;
  readonly resetKey: Uint8Array;
  readonly publicUrl: URL;
  readonly now: Temporal.Instant;
  readonly logger: Logger;
}

export interface CreateOwnerInput {
  readonly email: string;
  readonly name: string;
  readonly workspace: string;
  readonly timezone: string;
  readonly slug?: string | undefined;
}

export interface IssuedLink {
  readonly userId: string;
  readonly link: string;
}

export interface CreatedOwner extends IssuedLink {
  readonly workspaceId: string;
}

interface LoginRow {
  user_id: string;
  password_hash: string | null;
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const IANA_TZ = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/;
const EMAIL = /^[^\s@]+@[^\s@]+$/;
const NAME_MAX_LENGTH = 120;
const SLUG_MAX_LENGTH = 63;

export function resetLink(publicUrl: URL, token: string): string {
  const url = new URL('/reset-password', publicUrl);
  url.hash = `token=${token}`;
  return url.href;
}

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '');
}

function text(label: string, value: string): string {
  const cleaned = value.trim().normalize('NFC');
  if (cleaned === '') throw new UsageError(`${label} must not be empty`);
  if ([...cleaned].length > NAME_MAX_LENGTH) {
    throw new UsageError(`${label} must be at most ${NAME_MAX_LENGTH} characters`);
  }
  return cleaned;
}

function email(value: string): string {
  const cleaned = value.trim().normalize('NFC');
  if (cleaned.length > EMAIL_MAX_LENGTH || !EMAIL.test(cleaned)) {
    throw new UsageError('--email must be an email address');
  }
  return cleaned;
}

function timezone(value: string): string {
  if (!IANA_TZ.test(value)) throw new UsageError('--timezone must be an IANA time zone');
  try {
    return Temporal.Now.zonedDateTimeISO(value).timeZoneId;
  } catch {
    throw new UsageError('--timezone must be an IANA time zone');
  }
}

function slug(value: string | undefined, workspace: string): string {
  const chosen = value ?? slugify(workspace);
  if (!SLUG.test(chosen)) {
    throw new UsageError(
      value === undefined
        ? 'cannot derive a slug from the workspace name; pass --slug'
        : '--slug must match ^[a-z0-9][a-z0-9-]{0,62}$',
    );
  }
  return chosen;
}

function uniqueViolation(err: unknown, constraint: string): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const pgError = err as { code?: unknown; constraint?: unknown };
  return pgError.code === '23505' && pgError.constraint === constraint;
}

async function actAs(trx: TenantDb, userId: string): Promise<void> {
  await sql`select set_config('app.actor', ${actorSetting({ kind: 'user', id: userId })}, true)`.execute(
    trx,
  );
}

export async function createOwner(
  deps: UserCommandDeps,
  input: CreateOwnerInput,
): Promise<CreatedOwner> {
  const address = email(input.email);
  const name = text('--name', input.name);
  const workspace = text('--workspace', input.workspace);
  const zone = timezone(input.timezone);
  const workspaceSlug = slug(input.slug, workspace);

  let created: { userId: string; workspaceId: string };
  try {
    created = await deps.db.withActor({ kind: 'system' }, async (trx) => {
      const user = await sql<{ id: string }>`
        select auth_create_user(${address}, ${normalizeEmail(address)}, ${name}, null, 'en') as id
      `.execute(trx);
      const userId = user.rows[0]?.id;
      if (userId === undefined) throw new Error('auth_create_user returned no id');
      await actAs(trx, userId);
      const provisioned = await sql<{ workspace_id: string }>`
        select workspace_id from provision_organization(${name}, ${workspace}, ${workspaceSlug}, ${zone})
      `.execute(trx);
      const workspaceId = provisioned.rows[0]?.workspace_id;
      if (workspaceId === undefined)
        throw new Error('provision_organization returned no workspace');
      await trx
        .insertInto('security_events')
        .values({
          kind: 'cli.user_created',
          user_id: userId,
          detail: JSON.stringify({ workspace_id: workspaceId }),
        })
        .execute();
      return { userId, workspaceId };
    });
  } catch (err) {
    if (uniqueViolation(err, 'users_email_normalized_key')) {
      throw new CommandError('a user with this email already exists');
    }
    if (uniqueViolation(err, 'workspaces_slug_key')) {
      throw new CommandError('a workspace with this slug already exists; pass another --slug');
    }
    throw err;
  }

  deps.logger.info(created, 'owner created');
  const token = issueResetToken(deps.resetKey, {
    userId: created.userId,
    passwordHash: null,
    now: deps.now,
  });
  return { ...created, link: resetLink(deps.publicUrl, token) };
}

export async function resetPassword(deps: UserCommandDeps, rawEmail: string): Promise<IssuedLink> {
  const account = await deps.db.withActor({ kind: 'system' }, async (trx) => {
    const result = await sql<LoginRow>`
      select user_id, password_hash from auth_login_lookup(${normalizeEmail(rawEmail)})
    `.execute(trx);
    return result.rows[0];
  });
  if (account === undefined) throw new CommandError('no active user has this email');

  const userId = account.user_id;
  const revoked = await deps.db.withActor({ kind: 'user', id: userId }, async (trx) => {
    const count = await revokeAllSessions(trx, userId);
    await trx
      .insertInto('security_events')
      .values({ kind: 'cli.password_reset_issued', user_id: userId, detail: '{}' })
      .execute();
    return count;
  });

  deps.logger.info({ userId, revokedSessions: revoked }, 'password reset link issued');
  const token = issueResetToken(deps.resetKey, {
    userId,
    passwordHash: account.password_hash,
    now: deps.now,
  });
  return { userId, link: resetLink(deps.publicUrl, token) };
}
