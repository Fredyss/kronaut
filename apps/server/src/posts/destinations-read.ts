import { encodePublicId } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { iso } from '../http/time.ts';

function destinationRows(trx: TenantDb, workspaceId: string, postId: string) {
  return trx
    .selectFrom('post_destinations as d')
    .innerJoin('social_accounts as a', (join) =>
      join.onRef('a.workspace_id', '=', 'd.workspace_id').onRef('a.id', '=', 'd.social_account_id'),
    )
    .leftJoin('post_variants as v', (join) =>
      join.onRef('v.workspace_id', '=', 'd.workspace_id').onRef('v.id', '=', 'd.variant_id'),
    )
    .leftJoin('approval_requests as r', (join) =>
      join
        .onRef('r.workspace_id', '=', 'd.workspace_id')
        .onRef('r.post_id', '=', 'd.post_id')
        .on('r.state', '=', 'open'),
    )
    .leftJoin('approval_request_destinations as ard', (join) =>
      join
        .onRef('ard.workspace_id', '=', 'r.workspace_id')
        .onRef('ard.request_id', '=', 'r.id')
        .onRef('ard.destination_id', '=', 'd.id'),
    )
    .select([
      'd.id',
      'd.variant_id',
      'v.is_default',
      'd.social_account_id',
      'd.provider',
      'd.publish_type',
      'd.delivery_mode',
      'd.settings',
      'd.state',
      'd.state_reason',
      'd.version',
      'd.scheduled_at',
      'd.remote_url',
      'd.published_at',
      'd.last_error_code',
      'd.skip_signature',
      'd.frozen_signature',
      'ard.destination_id as requested_id',
      'ard.frozen_signature as requested_signature',
    ])
    .where('d.workspace_id', '=', workspaceId)
    .where('d.post_id', '=', postId)
    .orderBy('a.created_at')
    .orderBy('a.id')
    .orderBy('d.publish_type')
    .execute();
}

export async function loadDestinations(trx: TenantDb, workspaceId: string, postId: string) {
  const destinations = await destinationRows(trx, workspaceId, postId);
  return destinations.map((d) => ({
    variantId: d.is_default === false ? d.variant_id : null,
    id: encodePublicId('destination', d.id),
    accountId: encodePublicId('socialAccount', d.social_account_id),
    provider: d.provider,
    publishType: d.publish_type,
    deliveryMode: d.delivery_mode,
    settings: d.settings,
    state: d.state,
    stateReason: d.state_reason,
    version: d.version,
    scheduledAt: iso(d.scheduled_at),
    remoteUrl: d.remote_url,
    publishedAt: iso(d.published_at),
    lastErrorCode: d.last_error_code,
    skipSignature: d.skip_signature,
    signature: d.requested_id === null ? d.frozen_signature : d.requested_signature,
    signatureHeld: d.state !== 'draft' || d.requested_id !== null,
  }));
}
