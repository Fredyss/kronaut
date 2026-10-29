import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { notifyFor } from '../notifications/write.ts';
import {
  channelNeedsReauthEvent,
  providerAppMisconfiguredEvent,
  writeWebhookEvent,
} from '../webhooks/events.ts';
import type { AccountIncident } from './plan.ts';

export type CredentialFence =
  | { readonly id: string; readonly version: number }
  | { readonly unchangedSince: Date };

export type ChannelIncidentKind = AccountIncident | 'auth_expiring';

export async function openChannelIncident(
  trx: TenantDb,
  workspaceId: string,
  socialAccountId: string,
  kind: ChannelIncidentKind,
): Promise<string | null> {
  const row = await trx
    .insertInto('channel_incidents')
    .values({ workspace_id: workspaceId, social_account_id: socialAccountId, kind })
    .onConflict((oc) => {
      const open = oc
        .columns(['workspace_id', 'social_account_id', 'kind'])
        .where('resolved_at', 'is', null);
      return kind === 'auth_expiring'
        ? open.doNothing()
        : open.doUpdateSet({
            occurrences: sql<number>`channel_incidents.occurrences + 1`,
            last_seen_at: sql<Date>`now()`,
          });
    })
    .returning('id')
    .executeTakeFirst();
  return row?.id ?? null;
}

export async function resolveExpiring(
  trx: TenantDb,
  workspaceId: string,
  credentialId: string,
): Promise<void> {
  await trx
    .updateTable('channel_incidents')
    .set({ resolved_at: sql<Date>`now()` })
    .where('workspace_id', '=', workspaceId)
    .where('kind', '=', 'auth_expiring')
    .where('resolved_at', 'is', null)
    .where('social_account_id', '=', (eb) =>
      eb
        .selectFrom('account_credentials')
        .select('social_account_id')
        .where('workspace_id', '=', workspaceId)
        .where('id', '=', credentialId),
    )
    .execute();
}

export async function flagAccount(
  trx: TenantDb,
  target: {
    readonly workspaceId: string;
    readonly socialAccountId: string;
    readonly fence: CredentialFence;
    readonly incident: AccountIncident;
  },
): Promise<boolean> {
  const { workspaceId, socialAccountId, fence, incident } = target;
  const flagged = await trx
    .updateTable('social_accounts')
    .set({
      status: 'needs_reauth',
      status_reason: incident,
      status_changed_at: sql<Date>`now()`,
      last_error_at: sql<Date>`now()`,
      last_error_code: incident,
    })
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', socialAccountId)
    .where('status', '=', 'active')
    .where(({ exists, not, selectFrom }) => {
      const credentials = selectFrom('account_credentials')
        .select('id')
        .where('workspace_id', '=', workspaceId);
      return 'version' in fence
        ? exists(credentials.where('id', '=', fence.id).where('version', '=', fence.version))
        : not(
            exists(
              credentials
                .where('social_account_id', '=', socialAccountId)
                .where('updated_at', '>', fence.unchangedSince),
            ),
          );
    })
    .returning(['provider', 'status_changed_at'])
    .executeTakeFirst();
  if (flagged === undefined) return false;
  const incidentId = await openChannelIncident(trx, workspaceId, socialAccountId, incident);
  const event = channelNeedsReauthEvent(
    workspaceId,
    Temporal.Instant.fromEpochMilliseconds(flagged.status_changed_at.getTime()),
    { social_account_id: socialAccountId, provider: flagged.provider, reason: incident },
  );
  await writeWebhookEvent(trx, event);
  await notifyFor(trx, event, incidentId);
  return true;
}

export async function flagApp(
  trx: TenantDb,
  workspaceId: string,
  providerAppId: string,
  code: string,
): Promise<void> {
  const flipped = await trx
    .updateTable('provider_apps')
    .set({ status: 'misconfigured' })
    .where('id', '=', providerAppId)
    .where('status', '=', 'active')
    .returning('provider')
    .executeTakeFirst();
  const incident = await trx
    .insertInto('provider_app_incidents')
    .values({
      provider_app_id: providerAppId,
      kind: 'app_credentials_invalid',
      detail_code: code,
    })
    .onConflict((oc) =>
      oc.columns(['provider_app_id', 'kind']).where('resolved_at', 'is', null).doUpdateSet({
        occurrences: sql<number>`provider_app_incidents.occurrences + 1`,
        last_seen_at: sql<Date>`now()`,
        detail_code: code,
      }),
    )
    .returning('id')
    .executeTakeFirstOrThrow();
  if (flipped === undefined) return;
  await writeWebhookEvent(
    trx,
    providerAppMisconfiguredEvent(workspaceId, incident.id, {
      provider_app_id: providerAppId,
      provider: flipped.provider,
      code,
    }),
  );
}
