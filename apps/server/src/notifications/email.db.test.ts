import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { encodePublicId } from '@kronaut/core';
import type { Actor } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { Mailer, MailMessage, SendResult } from '@kronaut/egress/smtp';
import * as en from '@kronaut/i18n/messages/en';
import * as sk from '@kronaut/i18n/messages/sk';
import type { JobHelpers } from 'graphile-worker';
import { type RawBuilder, sql } from 'kysely';
import { pino } from 'pino';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CRON_TASKS, cronItems, cronTaskList } from '../cron.ts';
import { idleMediaGc } from '../media/testing/db.ts';
import {
  type PublishFixture,
  SEED_TEXT,
  type Seeded,
  startPublishFixture,
} from '../publish/testing.ts';
import {
  EMAIL_MAX_ATTEMPTS,
  type EmailDeps,
  emailDeps,
  emailNotifications,
  pendingNotifications,
} from './email.ts';
import { listNotifications } from './list.ts';

const SYSTEM: Actor = { kind: 'system' };
const CLI: Actor = { kind: 'cli' };
const BASE_URL = 'https://app.example.com';
const silent = pino({ level: 'silent' });

let test: TestDatabase;
let fixture: PublishFixture;
let seeded: Seeded;
let memberId: string;
let otherWorkspaceId: string;
let otherUserId: string;

interface FakeMailer extends Mailer {
  readonly sent: MailMessage[];
  results: SendResult[];
  delayMs: number;
}

function fakeMailer(): FakeMailer {
  const mailer: FakeMailer = {
    sent: [],
    results: [],
    delayMs: 0,
    async send(message) {
      if (mailer.delayMs > 0) await sleep(mailer.delayMs);
      mailer.sent.push(message);
      return mailer.results.shift() ?? 'sent';
    },
    close() {},
  };
  return mailer;
}

let mailer: FakeMailer;

function deps(): EmailDeps {
  return { db: fixture.db, mailer, logger: silent, publicBaseUrl: BASE_URL };
}

async function run(): Promise<Record<string, number>> {
  return JSON.parse(await emailNotifications(deps())) as Record<string, number>;
}

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startPublishFixture(test, 'ws-email');
  seeded = await fixture.seed();
  await fixture.owner.withActor(SYSTEM, async (trx) => {
    const variant = await trx
      .selectFrom('post_variants')
      .select('id')
      .where('post_id', '=', seeded.postId)
      .executeTakeFirstOrThrow();
    const text = { type: 'text', text: SEED_TEXT };
    await trx
      .insertInto('variant_items')
      .values({
        workspace_id: fixture.workspaceId,
        post_id: seeded.postId,
        variant_id: variant.id,
        position: 0,
        role: 'main',
        doc: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [text] }] }),
        doc_schema_v: 1,
      })
      .execute();
  });
  memberId = await fixture.createUser('member');
  otherUserId = await fixture.createUser('other');
  otherWorkspaceId = await fixture.db.withActor({ kind: 'user', id: otherUserId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Org B', 'Workspace B', 'ws-email-b', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  await fixture.owner.withActor(CLI, (trx) =>
    trx
      .insertInto('memberships')
      .values({ workspace_id: fixture.workspaceId, user_id: memberId, role: 'admin' })
      .execute(),
  );
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

beforeEach(async () => {
  mailer = fakeMailer();
  await fixture.owner.withActor(SYSTEM, (trx) => trx.deleteFrom('notifications').execute());
});

interface Insert {
  readonly workspaceId?: string;
  readonly userId?: string;
  readonly kind?: string;
  readonly ageHours?: number;
  readonly withPost?: boolean;
}

async function insert(options: Insert = {}): Promise<string> {
  const kind = options.kind ?? 'destination.failed';
  const withPost = options.withPost ?? kind.startsWith('destination.');
  const { id } = await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .insertInto('notifications')
      .values({
        workspace_id: options.workspaceId ?? fixture.workspaceId,
        user_id: options.userId ?? fixture.ownerUserId,
        kind,
        post_id: withPost ? seeded.postId : null,
        destination_id: withPost ? seeded.destinationId : null,
        payload: JSON.stringify({
          provider: 'fake',
          socialAccountId: seeded.accountId,
          reason: withPost ? 'permanent_error' : 'auth_expiring',
          ...(withPost ? { state: 'failed' } : {}),
        }),
        dedupe_key: `test.${randomUUID()}`,
        created_at: sql<Date>`now() - make_interval(hours => ${options.ageHours ?? 0})`,
      })
      .returning('id')
      .executeTakeFirstOrThrow(),
  );
  return id;
}

async function retryState(id: string) {
  return await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('notifications')
      .select(['email_attempts', sql<boolean>`email_retry_at > now()`.as('waiting')])
      .where('id', '=', id)
      .executeTakeFirstOrThrow(),
  );
}

async function setRetry(
  id: string,
  values: { email_attempts?: number; email_retry_at?: RawBuilder<Date> },
): Promise<void> {
  await fixture.owner.withActor(SYSTEM, (trx) =>
    trx.updateTable('notifications').set(values).where('id', '=', id).execute(),
  );
}

async function emailedAt(id: string): Promise<string | null> {
  const row = await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('notifications')
      .select(sql<string | null>`emailed_at::text`.as('emailed_at'))
      .where('id', '=', id)
      .executeTakeFirstOrThrow(),
  );
  return row.emailed_at;
}

async function setUser(userId: string, values: Record<string, unknown>): Promise<void> {
  await fixture.owner.withActor(SYSTEM, (trx) =>
    trx.updateTable('users').set(values).where('id', '=', userId).execute(),
  );
}

describe('notification email job', () => {
  it('sends in the recipient language with the excerpt and the post link, then marks the row', async () => {
    const id = await insert();
    await setUser(memberId, { ui_locale: 'sk' });
    const memberRow = await insert({ userId: memberId });

    expect(await run()).toEqual({ sent: 2, rejected: 0, transient: 0, skipped: 0 });

    expect(await emailedAt(id)).not.toBeNull();
    expect(await emailedAt(memberRow)).not.toBeNull();
    const toOwner = mailer.sent.find((mail) => mail.to === 'publisher@example.test');
    const toMember = mailer.sent.find((mail) => mail.to === 'member@example.test');
    expect(toOwner?.subject).toBe(en.notification_failed({ account: 'Fake account' }));
    expect(toOwner?.text).toContain(en.reason_permanent_error({}));
    expect(toOwner?.text).toContain(SEED_TEXT);
    expect(toOwner?.text).toContain(`${BASE_URL}/posts/${encodePublicId('post', seeded.postId)}`);
    expect(toMember?.subject).toBe(sk.notification_failed({ account: 'Fake account' }));
    await setUser(memberId, { ui_locale: 'en' });
  });

  it('links channel notifications to the channels page', async () => {
    await insert({ kind: 'channel.expiring' });
    await run();
    expect(mailer.sent[0]?.text).toContain(`${BASE_URL}/channels`);
  });

  it('backs off after a transient failure, then retries once the wait is over', async () => {
    const id = await insert();
    mailer.results = ['transient'];
    expect(await run()).toMatchObject({ sent: 0, transient: 1 });
    expect(await emailedAt(id)).toBeNull();
    expect(await retryState(id)).toMatchObject({ email_attempts: 1, waiting: true });

    expect(await run()).toEqual({ sent: 0, rejected: 0, transient: 0, skipped: 0 });
    await setRetry(id, { email_retry_at: sql<Date>`now() - interval '1 second'` });
    expect(await run()).toMatchObject({ sent: 1, transient: 0 });
    expect(await emailedAt(id)).not.toBeNull();
    expect(mailer.sent).toHaveLength(2);
  });

  it('gives up after the last transient attempt and keeps the row claimed', async () => {
    const id = await insert();
    await setRetry(id, { email_attempts: EMAIL_MAX_ATTEMPTS - 1 });
    mailer.results = ['transient'];
    expect(await run()).toMatchObject({ transient: 1 });
    expect(await emailedAt(id)).not.toBeNull();
    expect(await retryState(id)).toMatchObject({ email_attempts: EMAIL_MAX_ATTEMPTS });
    expect(await run()).toEqual({ sent: 0, rejected: 0, transient: 0, skipped: 0 });
  });

  it('keeps a rejected row claimed and never retries it', async () => {
    const id = await insert();
    mailer.results = ['rejected'];
    expect(await run()).toMatchObject({ rejected: 1 });
    expect(await emailedAt(id)).not.toBeNull();
    expect(await run()).toEqual({ sent: 0, rejected: 0, transient: 0, skipped: 0 });
    expect(mailer.sent).toHaveLength(1);
  });

  it('skips a recipient without an email and leaves the row claimed', async () => {
    const goneId = await fixture.createUser('gone');
    await fixture.owner.withActor(CLI, (trx) =>
      trx
        .insertInto('memberships')
        .values({ workspace_id: fixture.workspaceId, user_id: goneId, role: 'admin' })
        .execute(),
    );
    const id = await insert({ userId: goneId });
    await setUser(goneId, { email: null, email_normalized: null, erased_at: sql`now()` });

    expect(await run()).toMatchObject({ sent: 0, skipped: 1 });
    expect(await emailedAt(id)).not.toBeNull();
    expect(mailer.sent).toEqual([]);
  });

  it('ignores rows older than a day', async () => {
    const id = await insert({ ageHours: 25 });
    expect(await run()).toEqual({ sent: 0, rejected: 0, transient: 0, skipped: 0 });
    expect(await emailedAt(id)).toBeNull();
  });

  it('sends each row once when two runs overlap', async () => {
    const ids = await Promise.all(
      Array.from({ length: 5 }, () => insert({ kind: 'channel.expiring' })),
    );
    mailer.delayMs = 20;
    const [a, b] = await Promise.all([run(), run()]);
    expect((a?.sent ?? 0) + (b?.sent ?? 0)).toBe(5);
    expect(mailer.sent).toHaveLength(5);
    for (const id of ids) expect(await emailedAt(id)).not.toBeNull();
  });

  it('omits the excerpt and links the inbox once the post is gone', async () => {
    await fixture.owner.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('posts')
        .set({ deleted_at: sql<Date>`now()` })
        .where('id', '=', seeded.postId)
        .execute(),
    );
    try {
      await insert();
      await run();
      expect(mailer.sent[0]?.text).not.toContain(SEED_TEXT);
      expect(mailer.sent[0]?.text).toContain(`${BASE_URL}/inbox`);
    } finally {
      await fixture.owner.withActor(SYSTEM, (trx) =>
        trx
          .updateTable('posts')
          .set({ deleted_at: null })
          .where('id', '=', seeded.postId)
          .execute(),
      );
    }
  });
});

async function muteEmail(groups: string[]): Promise<void> {
  await fixture.owner.withActor(CLI, (trx) =>
    trx
      .updateTable('memberships')
      .set({ email_muted: groups })
      .where('workspace_id', '=', fixture.workspaceId)
      .where('user_id', '=', fixture.ownerUserId)
      .execute(),
  );
}

describe('notification email preferences', () => {
  it('skips a muted group, still sends the others and keeps the in-app list whole', async () => {
    await muteEmail(['failures']);
    try {
      const failed = await insert();
      const reauth = await insert({ kind: 'channel.needs_reauth' });
      expect(await run()).toEqual({ sent: 1, rejected: 0, transient: 0, skipped: 1 });
      expect(await emailedAt(failed)).not.toBeNull();
      expect(await emailedAt(reauth)).not.toBeNull();
      expect(mailer.sent.map((mail) => mail.subject)).toEqual([
        en.notification_needs_reauth({ account: 'Fake account' }),
      ]);
      const owner = { workspaceId: fixture.workspaceId, userId: fixture.ownerUserId, scope: null };
      const inbox = await fixture.db.withTenant(fixture.workspaceId, SYSTEM, (trx) =>
        listNotifications(trx, owner, { limit: 10, unreadOnly: true }),
      );
      expect(inbox.unread).toBe(2);
      expect(inbox.items.map((item) => item.id)).toEqual([
        encodePublicId('notification', reauth),
        encodePublicId('notification', failed),
      ]);

      await muteEmail([]);
      const again = await insert();
      expect(await run()).toEqual({ sent: 1, rejected: 0, transient: 0, skipped: 0 });
      expect(await emailedAt(again)).not.toBeNull();
      expect(mailer.sent.at(-1)?.subject).toBe(en.notification_failed({ account: 'Fake account' }));
    } finally {
      await muteEmail([]);
    }
  });
});

describe('pending notifications', () => {
  it('walks every workspace, oldest first in each, up to the cap', async () => {
    const other = { workspaceId: otherWorkspaceId, userId: otherUserId, kind: 'channel.expiring' };
    const newer = await insert({ kind: 'channel.expiring', ageHours: 1 });
    const older = await insert({ kind: 'channel.expiring', ageHours: 2 });
    const elsewhere = await insert(other);
    await insert({ ...other, ageHours: 25 });

    const all = await pendingNotifications(fixture.db);
    expect(
      all.filter((row) => row.workspaceId === fixture.workspaceId).map((row) => row.id),
    ).toEqual([older, newer]);
    expect(all.filter((row) => row.workspaceId === otherWorkspaceId).map((row) => row.id)).toEqual([
      elsewhere,
    ]);
    expect(await pendingNotifications(fixture.db, 2)).toHaveLength(2);
    const shared = await pendingNotifications(fixture.db, 2, 1);
    expect(shared.map((row) => row.workspaceId).sort()).toEqual(
      [fixture.workspaceId, otherWorkspaceId].sort(),
    );
  });

  it('sends nothing while publishing is paused', async () => {
    const id = await insert({ kind: 'channel.expiring' });
    await fixture.db.withActor(SYSTEM, (trx) =>
      sql`select instance_fence(${randomUUID()}::uuid)`.execute(trx),
    );
    await fixture.owner.withActor(SYSTEM, (trx) =>
      sql`update instance_state set publishing_paused = true, paused_reason = 'instance_id_mismatch'`.execute(
        trx,
      ),
    );
    try {
      expect(await run()).toEqual({ sent: 0, rejected: 0, transient: 0, skipped: 0 });
      expect(await emailedAt(id)).toBeNull();
    } finally {
      await fixture.owner.withActor(SYSTEM, (trx) =>
        sql`update instance_state set publishing_paused = false, paused_reason = null`.execute(trx),
      );
    }
  });
});

describe('notification email registration', () => {
  const urls = { publicUrl: new URL(`${BASE_URL}/`) };

  it('registers nothing without SMTP', () => {
    expect(emailDeps({ ...urls, smtp: null }, fixture.db, silent)).toBeNull();
    expect(cronItems(false).map((item) => item.task)).not.toContain(CRON_TASKS.notificationEmail);
    expect(
      Object.keys(cronTaskList(fixture.db, silent, { ...fixture.deps, ...idleMediaGc() }, null)),
    ).not.toContain(CRON_TASKS.notificationEmail);
  });

  it('runs every minute through recordCronRun once SMTP is configured', async () => {
    expect(
      cronItems(true).find((item) => item.task === CRON_TASKS.notificationEmail),
    ).toMatchObject({ options: { backfillPeriod: 0, maxAttempts: 1 } });
    await insert({ kind: 'channel.expiring' });
    const tasks = cronTaskList(fixture.db, silent, { ...fixture.deps, ...idleMediaGc() }, deps());
    await tasks[CRON_TASKS.notificationEmail]?.({}, {} as JobHelpers);
    const last = await fixture.owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('cron_runs')
        .select(['outcome', 'detail'])
        .where('task', '=', CRON_TASKS.notificationEmail)
        .orderBy('id', 'desc')
        .executeTakeFirstOrThrow(),
    );
    expect(last).toEqual({
      outcome: 'ok',
      detail: JSON.stringify({ sent: 1, rejected: 0, transient: 0, skipped: 0 }),
    });
  });
});
