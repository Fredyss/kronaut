import type { Actor, Database, DB, TenantDb } from '@kronaut/db';
import { type ExpressionBuilder, sql } from 'kysely';
import type { ProviderRegistry } from '../../base/providers/providers.ts';
import { auditSystem, wipeProfile } from './disconnect.ts';

const SYSTEM: Actor = { kind: 'system' };
// The task runs daily; the margin keeps the purge inside the policy deadline despite the run interval plus one missed run or the day it takes to flag a dead grant.
const PURGE_MARGIN_DAYS = 2;

export interface RetentionRule {
  readonly provider: string;
  readonly disconnectedDays: number;
  readonly lapsedDays: number;
}

export interface DataPurge {
  readonly workspaceId: string;
  readonly rule: RetentionRule;
  readonly batch: number;
  readonly correlationId: string;
}

type Accounts = ExpressionBuilder<DB & { a: DB['social_accounts'] }, 'a'>;
type Destinations = ExpressionBuilder<DB & { d: DB['post_destinations'] }, 'd'>;

export function retentionRules(providers: ProviderRegistry): RetentionRule[] {
  return providers
    .list()
    .flatMap(({ manifest }) =>
      manifest.dataRetention === undefined
        ? []
        : [{ provider: manifest.id, ...manifest.dataRetention }],
    );
}

function statusOlderThan(eb: Accounts, status: string, days: number) {
  return eb.and([
    eb('a.status', '=', status),
    eb(
      'a.status_changed_at',
      '<',
      sql<Date>`now() - make_interval(days => greatest(${days}::int - ${PURGE_MARGIN_DAYS}::int, 0))`,
    ),
  ]);
}

function destinationMetrics(eb: Destinations, workspaceId: string) {
  return eb.or([
    eb.exists(
      eb
        .selectFrom('post_metric_snapshots as s')
        .select('s.metric')
        .where('s.workspace_id', '=', workspaceId)
        .whereRef('s.destination_id', '=', 'd.id'),
    ),
    eb.exists(
      eb
        .selectFrom('destination_metric_pulls as p')
        .select('p.step')
        .where('p.workspace_id', '=', workspaceId)
        .whereRef('p.destination_id', '=', 'd.id'),
    ),
  ]);
}

function holdsData(eb: Accounts, workspaceId: string) {
  return eb.or([
    eb('a.display_name', '<>', ''),
    eb('a.handle', 'is not', null),
    eb('a.profile_url', 'is not', null),
    eb('a.provider_subject_id', 'is not', null),
    eb.exists(
      eb
        .selectFrom('account_credentials as c')
        .select('c.id')
        .where('c.workspace_id', '=', workspaceId)
        .whereRef('c.social_account_id', '=', 'a.id'),
    ),
    eb.exists(
      eb
        .selectFrom('account_daily_metrics as m')
        .select('m.day')
        .where('m.workspace_id', '=', workspaceId)
        .whereRef('m.social_account_id', '=', 'a.id'),
    ),
    eb.exists(
      eb
        .selectFrom('post_destinations as d')
        .select('d.id')
        .where('d.workspace_id', '=', workspaceId)
        .whereRef('d.social_account_id', '=', 'a.id')
        .where((inner) => destinationMetrics(inner, workspaceId)),
    ),
  ]);
}

async function lapsedAccounts(trx: TenantDb, purge: DataPurge): Promise<string[]> {
  const { workspaceId, rule } = purge;
  const rows = await trx
    .selectFrom('social_accounts as a')
    .select('a.id')
    .where('a.workspace_id', '=', workspaceId)
    .where('a.provider', '=', rule.provider)
    .where((eb) =>
      eb.or([
        statusOlderThan(eb, 'disconnected', rule.disconnectedDays),
        statusOlderThan(eb, 'needs_reauth', rule.lapsedDays),
      ]),
    )
    .where((eb) => holdsData(eb, workspaceId))
    .orderBy('a.id')
    .limit(purge.batch)
    .forUpdate()
    .execute();
  return rows.map((row) => row.id);
}

async function purgeAccount(trx: TenantDb, purge: DataPurge, accountId: string): Promise<void> {
  const { workspaceId } = purge;
  const destinations = trx
    .selectFrom('post_destinations')
    .select('id')
    .where('workspace_id', '=', workspaceId)
    .where('social_account_id', '=', accountId);
  await trx
    .deleteFrom('account_credentials')
    .where('workspace_id', '=', workspaceId)
    .where('social_account_id', '=', accountId)
    .execute();
  await wipeProfile(trx, { workspaceId, accountId });
  await trx
    .deleteFrom('account_daily_metrics')
    .where('workspace_id', '=', workspaceId)
    .where('social_account_id', '=', accountId)
    .execute();
  await trx
    .deleteFrom('post_metric_snapshots')
    .where('workspace_id', '=', workspaceId)
    .where('destination_id', 'in', destinations)
    .execute();
  await trx
    .deleteFrom('destination_metric_pulls')
    .where('workspace_id', '=', workspaceId)
    .where('destination_id', 'in', destinations)
    .execute();
  await auditSystem(trx, {
    workspaceId,
    accountId,
    action: 'channel.data_purged',
    correlationId: purge.correlationId,
  });
}

export async function purgeLapsedData(db: Database, purge: DataPurge): Promise<number> {
  let total = 0;
  for (;;) {
    const purged = await db.withTenant(purge.workspaceId, SYSTEM, async (trx) => {
      const accounts = await lapsedAccounts(trx, purge);
      for (const accountId of accounts) await purgeAccount(trx, purge, accountId);
      return accounts.length;
    });
    total += purged;
    if (purged < purge.batch) return total;
  }
}
