import type { Actor, Database, TenantDb } from '@kronaut/db';
import type { Task } from 'graphile-worker';
import { sql } from 'kysely';
import type { Logger } from 'pino';
import * as z from 'zod';
import { markDisconnected } from '../channels/disconnect.ts';
import { flagAccount } from '../publish/incidents.ts';

export const DATA_DELETION_REASON = 'data_deletion_requested';
const SYSTEM: Actor = { kind: 'system' };
const WORKSPACE_PAGE = 1000;
const BY_ACCOUNT_ID: ReadonlySet<string> = new Set(['instagram', 'threads']);

const PayloadSchema = z.object({ requestId: z.uuid() });

export interface MetaLifecycleDeps {
  readonly db: Database;
  readonly logger: Logger;
}

interface LifecycleRequest {
  readonly id: string;
  readonly provider: string;
  readonly kind: string;
  readonly subjectId: string;
}

interface Matched {
  readonly id: string;
  readonly status: string;
  readonly status_reason: string | null;
}

interface Step {
  readonly trx: TenantDb;
  readonly workspaceId: string;
  readonly account: Matched;
  readonly requestId: string;
}

async function loadRequest(db: Database, requestId: string): Promise<LifecycleRequest | null> {
  const row = await db.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('meta_lifecycle_requests')
      .select(['id', 'provider', 'kind', 'subject_id'])
      .where('id', '=', requestId)
      .where('completed_at', 'is', null)
      .executeTakeFirst(),
  );
  if (row?.subject_id == null) return null;
  return { id: row.id, provider: row.provider, kind: row.kind, subjectId: row.subject_id };
}

function matching(trx: TenantDb, workspaceId: string, request: LifecycleRequest) {
  return trx
    .selectFrom('social_accounts')
    .select(['id', 'status', 'status_reason'])
    .where('workspace_id', '=', workspaceId)
    .where('provider', '=', request.provider)
    .where((eb) => {
      const bySubject = eb('provider_subject_id', '=', request.subjectId);
      return BY_ACCOUNT_ID.has(request.provider)
        ? eb.or([bySubject, eb('provider_account_id', '=', request.subjectId)])
        : bySubject;
    })
    .orderBy('id')
    .forUpdate()
    .execute();
}

async function deleteCredentials({ trx, workspaceId, account }: Step): Promise<void> {
  await trx
    .deleteFrom('account_credentials')
    .where('workspace_id', '=', workspaceId)
    .where('social_account_id', '=', account.id)
    .execute();
}

async function audit(step: Step, action: string): Promise<void> {
  const { trx, workspaceId, account } = step;
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: workspaceId,
      actor_kind: 'system',
      surface: 'worker',
      action,
      resource_kind: 'social_account',
      resource_id: account.id,
      social_account_ids: [account.id],
      outcome: 'ok',
      correlation_id: step.requestId,
    })
    .execute();
}

async function deleteData(step: Step): Promise<boolean> {
  const { trx, workspaceId, account } = step;
  await deleteCredentials(step);
  if (account.status === 'disconnected' && account.status_reason === DATA_DELETION_REASON) {
    return false;
  }
  await markDisconnected(trx, { workspaceId, accountId: account.id, reason: DATA_DELETION_REASON });
  await trx
    .updateTable('social_accounts')
    .set({ handle: null, display_name: '', profile_url: null, provider_subject_id: null })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', account.id)
    .execute();
  await audit(step, 'channel.data_deleted');
  return true;
}

async function deauthorize(step: Step): Promise<boolean> {
  const { trx, workspaceId, account } = step;
  let flagged = false;
  if (account.status === 'active') {
    const { now } = await trx.selectNoFrom(sql<Date>`now()`.as('now')).executeTakeFirstOrThrow();
    flagged = await flagAccount(trx, {
      workspaceId,
      socialAccountId: account.id,
      fence: { unchangedSince: now },
      incident: 'auth_revoked',
    });
  }
  await deleteCredentials(step);
  if (flagged) await audit(step, 'channel.deauthorized');
  return flagged;
}

function processWorkspace(
  db: Database,
  workspaceId: string,
  request: LifecycleRequest,
): Promise<void> {
  return db.withTenant(workspaceId, SYSTEM, async (trx) => {
    let changed = 0;
    for (const account of await matching(trx, workspaceId, request)) {
      const step = { trx, workspaceId, account, requestId: request.id };
      if (await (request.kind === 'deletion' ? deleteData(step) : deauthorize(step))) changed++;
    }
    if (changed === 0) return;
    await trx
      .updateTable('meta_lifecycle_requests')
      .set({ matched: sql<number>`matched + ${changed}` })
      .where('id', '=', request.id)
      .where('completed_at', 'is', null)
      .execute();
  });
}

export async function runMetaLifecycle(db: Database, requestId: string): Promise<number | null> {
  const request = await loadRequest(db, requestId);
  if (request === null) return null;
  let after: string | null = null;
  for (;;) {
    const page = await db.sweeps.workspaces(after, WORKSPACE_PAGE);
    for (const workspaceId of page) await processWorkspace(db, workspaceId, request);
    after = page.at(-1) ?? null;
    if (page.length < WORKSPACE_PAGE) break;
  }
  const done = await db.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('meta_lifecycle_requests')
      .set({ completed_at: sql<Date>`now()`, subject_id: null })
      .where('id', '=', requestId)
      .where('completed_at', 'is', null)
      .returning('matched')
      .executeTakeFirst(),
  );
  return done?.matched ?? null;
}

export function metaLifecycleTask(deps: MetaLifecycleDeps): Task {
  return async (payload) => {
    const parsed = PayloadSchema.safeParse(payload);
    if (!parsed.success) {
      deps.logger.error('meta lifecycle job payload is invalid');
      return;
    }
    const { requestId } = parsed.data;
    const matched = await runMetaLifecycle(deps.db, requestId);
    if (matched !== null) deps.logger.info({ requestId, matched }, 'meta lifecycle request done');
  };
}
