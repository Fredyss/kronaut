import type { Actor, Database, SweepRow, TenantDb } from '@kronaut/db';
import { createMailer, type Mailer, type MailMessage } from '@kronaut/egress/smtp';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import { Temporal } from 'temporal-polyfill';
import type { ServerConfig } from '../config.ts';
import { bindUserIn } from '../http/principal.ts';
import { buildNotificationEmail } from './email-message.ts';
import { isMuted } from './groups.ts';
import { notificationItems } from './list.ts';
import type { Owner } from './owner.ts';

export const EMAIL_BATCH = 100;
const WORKSPACE_PAGE = 1000;
// One workspace whose rows keep failing transiently must not hold the whole batch for a day.
const WORKSPACE_SHARE = 25;
export const EMAIL_MAX_ATTEMPTS = 8;
const RETRY_CAP_MINUTES = 60;
const SYSTEM: Actor = { kind: 'system' };
const NEVER = Temporal.Instant.fromEpochMilliseconds(0);

export interface EmailDeps {
  readonly db: Database;
  readonly mailer: Mailer;
  readonly logger: Logger;
  readonly publicBaseUrl: string;
}

type Outcome = 'sent' | 'rejected' | 'transient' | 'skipped';

export function emailDeps(
  config: Pick<ServerConfig, 'smtp' | 'publicUrl'>,
  db: Database,
  logger: Logger,
): EmailDeps | null {
  if (config.smtp === null) return null;
  const mailer = createMailer(config.smtp, {
    onFailure: (failure) => logger.warn({ smtp: failure }, 'smtp send failed'),
  });
  return { db, mailer, logger, publicBaseUrl: config.publicUrl.origin };
}

interface Claimed {
  readonly user_id: string;
  readonly kind: string;
}

async function claim(db: Database, row: SweepRow): Promise<Claimed | null> {
  const claimed = await db.withTenant(row.workspaceId, SYSTEM, (trx) =>
    trx
      .updateTable('notifications')
      .set({ emailed_at: sql<Date>`now()` })
      .where('workspace_id', '=', row.workspaceId)
      .where('id', '=', row.id)
      .where('emailed_at', 'is', null)
      .returning(['user_id', 'kind'])
      .executeTakeFirst(),
  );
  return claimed ?? null;
}

async function release(db: Database, row: SweepRow): Promise<boolean> {
  const retried = await db.withTenant(row.workspaceId, SYSTEM, (trx) =>
    trx
      .updateTable('notifications')
      .set({
        email_attempts: sql<number>`email_attempts + 1`,
        emailed_at: sql<Date | null>`case when email_attempts + 1 >= ${EMAIL_MAX_ATTEMPTS}
          then emailed_at end`,
        email_retry_at: sql<Date>`now() + make_interval(mins => least(${RETRY_CAP_MINUTES},
          power(2, email_attempts)::integer))`,
      })
      .where('workspace_id', '=', row.workspaceId)
      .where('id', '=', row.id)
      .returning(sql<boolean>`emailed_at is null`.as('retried'))
      .executeTakeFirst(),
  );
  return retried?.retried === true;
}

async function recipient(trx: TenantDb, workspaceId: string, userId: string) {
  const profile = await sql<{ email: string | null; ui_locale: string }>`
    select email, ui_locale from workspace_member_profiles() where user_id = ${userId}::uuid
  `.execute(trx);
  const row = profile.rows[0];
  if (row === undefined || row.email === null) return null;
  const membership = await trx
    .selectFrom('memberships')
    .select('email_muted')
    .where('workspace_id', '=', workspaceId)
    .where('user_id', '=', userId)
    .executeTakeFirst();
  if (membership === undefined) return null;
  const bound = await bindUserIn(trx, workspaceId, userId, NEVER);
  if (bound === null) return null;
  const { restricted } = bound.principal;
  const empty = { brandIds: [], locationIds: [], socialAccountIds: [] };
  const owner: Owner = {
    workspaceId,
    userId,
    scope: restricted ? (bound.accessScope ?? empty) : null,
  };
  return { email: row.email, locale: row.ui_locale, muted: membership.email_muted, owner };
}

async function compose(
  deps: EmailDeps,
  row: SweepRow,
  claimed: Claimed,
): Promise<MailMessage | null> {
  return await deps.db.withTenant(row.workspaceId, SYSTEM, async (trx) => {
    const to = await recipient(trx, row.workspaceId, claimed.user_id);
    if (to === null || isMuted(claimed.kind, to.muted)) return null;
    const [item] = await notificationItems(trx, to.owner, {
      limit: 1,
      unreadOnly: false,
      id: row.id,
    });
    if (item === undefined) return null;
    const workspace = await trx
      .selectFrom('workspaces')
      .select('name')
      .where('id', '=', row.workspaceId)
      .executeTakeFirstOrThrow();
    const content = buildNotificationEmail({
      locale: to.locale,
      item,
      workspaceName: workspace.name,
      publicBaseUrl: deps.publicBaseUrl,
    });
    return { to: to.email, ...content };
  });
}

async function emailOne(deps: EmailDeps, row: SweepRow): Promise<Outcome> {
  const claimed = await claim(deps.db, row);
  if (claimed === null) return 'skipped';
  let message: MailMessage | null;
  try {
    message = await compose(deps, row, claimed);
  } catch (err) {
    await release(deps.db, row);
    throw err;
  }
  if (message === null) return 'skipped';
  const result = await deps.mailer.send(message);
  const ids = { workspaceId: row.workspaceId, notificationId: row.id };
  if (result === 'transient' && !(await release(deps.db, row))) {
    deps.logger.warn(ids, 'notification email gave up after repeated transient failures');
  }
  if (result === 'rejected') deps.logger.warn(ids, 'notification email rejected');
  return result;
}

async function paused(db: Database): Promise<boolean> {
  return await db.withActor(SYSTEM, async (trx) => {
    const result = await sql<{ paused: boolean }>`select instance_paused() as paused`.execute(trx);
    return result.rows[0]?.paused === true;
  });
}

async function pendingIn(db: Database, workspaceId: string, limit: number): Promise<SweepRow[]> {
  const rows = await db.withTenant(workspaceId, SYSTEM, (trx) =>
    trx
      .selectFrom('notifications')
      .select('id')
      .where('workspace_id', '=', workspaceId)
      .where('emailed_at', 'is', null)
      .where('created_at', '>', sql<Date>`now() - interval '1 day'`)
      .where((eb) =>
        eb.or([eb('email_retry_at', 'is', null), eb('email_retry_at', '<=', sql<Date>`now()`)]),
      )
      .orderBy('created_at')
      .orderBy('id')
      .limit(limit)
      .execute(),
  );
  return rows.map((row) => ({ workspaceId, id: row.id }));
}

export async function pendingNotifications(
  db: Database,
  cap = EMAIL_BATCH,
  perWorkspace = WORKSPACE_SHARE,
): Promise<SweepRow[]> {
  const rows: SweepRow[] = [];
  let after: string | null = null;
  for (;;) {
    const page = await db.sweeps.workspaces(after, WORKSPACE_PAGE);
    for (const workspaceId of page) {
      rows.push(...(await pendingIn(db, workspaceId, Math.min(perWorkspace, cap - rows.length))));
      if (rows.length >= cap) return rows;
    }
    after = page.at(-1) ?? null;
    if (page.length < WORKSPACE_PAGE) return rows;
  }
}

export async function emailNotifications(deps: EmailDeps): Promise<string> {
  const counts: Record<Outcome, number> = { sent: 0, rejected: 0, transient: 0, skipped: 0 };
  if (await paused(deps.db)) return JSON.stringify(counts);
  const rows = await pendingNotifications(deps.db);
  for (const row of rows) {
    try {
      counts[await emailOne(deps, row)]++;
    } catch (err) {
      counts.transient++;
      deps.logger.error(
        { err, workspaceId: row.workspaceId, notificationId: row.id },
        'notification email failed',
      );
    }
  }
  return JSON.stringify(counts);
}
