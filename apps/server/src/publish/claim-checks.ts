import { contentHash } from '@kronaut/compose';
import type { DestinationState, StateReason } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import type { ProviderEntry } from '../providers.ts';
import { contentHashInput, type ResolvedDestination } from '../snapshot.ts';
import type { ClaimResult, ClaimScope } from './claim.ts';
import { prepareInput, type Ready, readResolved } from './input.ts';
import { authorizeScheduler } from './principal.ts';
import { auditTransition, type DestinationUpdate, transition } from './transition.ts';

const ACCOUNT_BLOCKS: Readonly<Record<string, StateReason>> = {
  needs_reauth: 'account_needs_reauth',
  disconnected: 'account_disconnected',
  disabled: 'account_disabled',
};

function selectAccount(trx: TenantDb, workspaceId: string, socialAccountId: string) {
  return trx
    .selectFrom('social_accounts')
    .select([
      'id',
      'status',
      'provider_app_id',
      'provider_account_id',
      'handle',
      'capabilities',
      'brand_id',
      'location_id',
    ])
    .where('workspace_id', '=', workspaceId)
    .where('id', '=', socialAccountId)
    .executeTakeFirstOrThrow();
}

export type ClaimAccount = Awaited<ReturnType<typeof selectAccount>>;

export interface Access {
  readonly kind: 'access';
  readonly account: ClaimAccount;
}

export interface Inputs {
  readonly kind: 'inputs';
  readonly entry: ProviderEntry;
  readonly prepared: Ready;
}

async function settle(
  scope: ClaimScope,
  state: DestinationState,
  reason: StateReason | null,
  set: DestinationUpdate = {},
): Promise<ClaimResult> {
  await transition(scope.trx, scope.ref, { state, reason, set });
  await auditTransition(scope.trx, scope.ref, { state, reason }, null);
  return { kind: 'settled', state };
}

function fail(scope: ClaimScope, code: string, message: string | null = null) {
  return settle(scope, 'failed', 'permanent_error', {
    last_error_code: code,
    last_error_message: message,
  });
}

export async function checkAccess(scope: ClaimScope): Promise<ClaimResult | Access> {
  const { deps, trx, job, post, dest } = scope;
  if (dest.delivery_mode === 'reminder') return settle(scope, 'awaiting_manual', null);
  if (dest.late) return settle(scope, 'failed', 'late_window_exceeded');

  const account = await selectAccount(trx, job.workspaceId, dest.social_account_id);
  const accountBlock = ACCOUNT_BLOCKS[account.status];
  if (accountBlock !== undefined) return settle(scope, 'blocked', accountBlock);
  const providerApp = await trx
    .selectFrom('provider_apps')
    .select('status')
    .where('id', '=', account.provider_app_id)
    .executeTakeFirstOrThrow();
  if (providerApp.status !== 'active') return settle(scope, 'blocked', 'app_credentials_invalid');

  const now = deps.now();
  const decision = await authorizeScheduler(trx, {
    workspaceId: job.workspaceId,
    post,
    scheduler: { userId: dest.scheduled_by_user_id, grantId: dest.scheduled_by_grant_id },
    approvalRequestId: dest.approval_request_id,
    account: { id: account.id, brandId: account.brand_id, locationId: account.location_id },
    now,
  });
  if (decision.kind !== 'allow') return settle(scope, 'blocked', 'policy_denied');
  return { kind: 'access', account };
}

async function approvalVoided(scope: ClaimScope, resolved: ResolvedDestination): Promise<boolean> {
  const { trx, job, dest } = scope;
  if (dest.approval_request_id === null) return false;
  const bound = await trx
    .selectFrom('approval_request_destinations')
    .select('content_hash')
    .where('workspace_id', '=', job.workspaceId)
    .where('request_id', '=', dest.approval_request_id)
    .where('destination_id', '=', job.id)
    .executeTakeFirst();
  const hash = Buffer.from(await contentHash(contentHashInput(resolved)));
  return bound === undefined || !hash.equals(bound.content_hash);
}

export async function checkContent(
  scope: ClaimScope,
  account: ClaimAccount,
): Promise<ClaimResult | Inputs> {
  const { deps, trx, job, post, dest } = scope;
  const resolved = await readResolved(trx, {
    workspaceId: job.workspaceId,
    postId: post.id,
    frozenPostVersion: scope.postVersion,
    socialAccountId: dest.social_account_id,
    publishType: dest.publish_type,
  });
  if (resolved === undefined) return fail(scope, 'snapshot_invalid');

  if (await approvalVoided(scope, resolved)) {
    return settle(scope, 'draft', 'approval_voided', {
      approval_request_id: null,
      approval_schedule_bound: null,
      approved_scheduled_local: null,
      approved_scheduled_tz: null,
      approved_tolerance_min: null,
    });
  }

  const entry = deps.providers.get(dest.provider);
  if (entry === undefined) return fail(scope, 'provider_unavailable');
  const prepared = await prepareInput(deps, trx, {
    workspaceId: job.workspaceId,
    publishType: dest.publish_type,
    account,
    entry,
    resolved,
    acked: new Set(dest.preflight_acked_codes),
  });
  if (prepared.kind === 'fail') return fail(scope, prepared.code, prepared.message);
  if (prepared.kind === 'no_credential') return settle(scope, 'blocked', 'account_needs_reauth');
  return { kind: 'inputs', entry, prepared };
}
