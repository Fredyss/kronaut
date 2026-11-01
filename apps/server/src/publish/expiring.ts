import type { ProviderManifest } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import type { RefreshableCredential } from '../credentials/credential-store.ts';
import { notifyFor } from '../notifications/write.ts';
import { channelExpiringEvent, writeWebhookEvent } from '../webhooks/events.ts';
import { openChannelIncident } from './incidents.ts';
import type { RefreshOutcome } from './refresh.ts';
import { consumesToken } from './refresh-lease.ts';

export type Renewal = RefreshOutcome | 'unrefreshable';

export interface ExpiringAccount {
  readonly workspaceId: string;
  readonly socialAccountId: string;
  readonly provider: string;
  readonly expiresAt: Date;
}

function leadFor(auth: ProviderManifest['auth'], renewal: Renewal): number | null {
  if (renewal === 'unrefreshable') return auth.warnLeadMs;
  const { kind } = renewal;
  return kind === 'transient' || kind === 'skipped' || kind === 'app' ? auth.warnLeadMs / 2 : null;
}

export function expiringAt(
  auth: ProviderManifest['auth'],
  credential: RefreshableCredential,
  now: Temporal.Instant,
  renewal: Renewal,
): Date | null {
  const at = consumesToken(auth.refresh) ? credential.refreshExpiresAt : credential.accessExpiresAt;
  const leadMs = leadFor(auth, renewal);
  if (at === null || leadMs === null) return null;
  return at.getTime() <= now.epochMilliseconds + leadMs ? at : null;
}

export async function openExpiring(trx: TenantDb, account: ExpiringAccount): Promise<boolean> {
  const { workspaceId, socialAccountId } = account;
  const incidentId = await openChannelIncident(trx, workspaceId, socialAccountId, 'auth_expiring');
  if (incidentId === null) return false;
  const event = channelExpiringEvent(workspaceId, incidentId, {
    social_account_id: socialAccountId,
    provider: account.provider,
    expires_at: Temporal.Instant.fromEpochMilliseconds(account.expiresAt.getTime()).toString(),
  });
  await writeWebhookEvent(trx, event);
  await notifyFor(trx, event, incidentId);
  await trx
    .updateTable('channel_incidents')
    .set({ notified_at: sql<Date>`now()` })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', incidentId)
    .execute();
  return true;
}

export interface WarningState {
  readonly provider: string;
  readonly warned: boolean;
}

export async function warningState(
  trx: TenantDb,
  workspaceId: string,
  credentialId: string,
): Promise<WarningState | undefined> {
  return await trx
    .selectFrom('account_credentials as c')
    .innerJoin('social_accounts as a', (join) =>
      join.onRef('a.workspace_id', '=', 'c.workspace_id').onRef('a.id', '=', 'c.social_account_id'),
    )
    .select(({ exists, selectFrom }) => [
      'a.provider',
      exists(
        selectFrom('channel_incidents as i')
          .select('i.id')
          .whereRef('i.workspace_id', '=', 'c.workspace_id')
          .whereRef('i.social_account_id', '=', 'c.social_account_id')
          .where('i.kind', '=', 'auth_expiring')
          .where('i.resolved_at', 'is', null),
      )
        .$castTo<boolean>()
        .as('warned'),
    ])
    .where('c.workspace_id', '=', workspaceId)
    .where('c.id', '=', credentialId)
    .executeTakeFirst();
}
