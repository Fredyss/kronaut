import { createHash } from 'node:crypto';
import { CONTENT_HASH_V, canonicalJson, contentHash, type ValidationIssue } from '@kronaut/compose';
import type { DB, TenantDb } from '@kronaut/db';
import { sql, type UpdateObject } from 'kysely';
import type { ProviderRegistry } from '../../../base/providers/providers.ts';
import { enqueueShortLinks } from '../../../infrastructure/jobs/jobs.ts';
import { APPROVAL_UNBOUND } from '../../../steps/approvals/binding.ts';
import {
  contentHashInput,
  SNAPSHOT_V,
  unsignedHashInput,
} from '../../../steps/publish/snapshot.ts';
import { type Checked, inspect, preflightFailed, type Snapshot } from './preflight.ts';

// A new schedule is a new publish. Checkpoints and the attempt budget belong to the previous one.
export const FRESH_PUBLISH: UpdateObject<DB, 'post_destinations'> = {
  attempt_count: 0,
  claimed_attempt_id: null,
  provider_state: sql`'{}'::jsonb`,
  last_error_code: null,
  last_error_message: null,
};

export const UNFROZEN: UpdateObject<DB, 'post_destinations'> = {
  ...FRESH_PUBLISH,
  ...APPROVAL_UNBOUND,
  frozen_at: null,
  frozen_post_version: null,
  content_hash: null,
  content_hash_v: null,
  frozen_signature: null,
  brand_id_at_freeze: null,
  location_id_at_freeze: null,
  scheduled_local: null,
  scheduled_tz: null,
  scheduled_at: null,
  tz_resolution: null,
  tzdb_version: null,
  run_at: null,
  deadline_at: null,
  cancel_requested_at: null,
  preflight: null,
  preflight_acked_codes: [],
};

export interface FreezeTarget {
  readonly id: string;
  readonly index: number;
  readonly socialAccountId: string;
  readonly provider: string;
  readonly publishType: string;
  readonly deliveryMode: string;
  readonly settings: unknown;
  readonly variantId: string | null;
  readonly skipSignature: boolean;
  readonly held: { readonly signature: unknown } | null;
}

export interface Frozen {
  readonly id: string;
  readonly contentHash: Buffer;
  readonly signature: unknown;
  readonly agentAuthored: boolean;
  readonly preflight: readonly ValidationIssue[];
  readonly ackedCodes: readonly string[];
}

export interface FreezeInput {
  readonly workspaceId: string;
  readonly postId: string;
  readonly postVersion: number;
  readonly targets: readonly FreezeTarget[];
  readonly acknowledged: ReadonlySet<string>;
  readonly reason: 'submit' | 'schedule';
}

interface Hashed extends Checked {
  readonly hash: Buffer;
  readonly unsignedHash: Buffer | null;
}

async function insertRevision(
  trx: TenantDb,
  input: FreezeInput,
  snapshot: Snapshot,
  hashed: readonly Hashed[],
) {
  const { workspaceId, postId, postVersion } = input;
  await trx
    .insertInto('post_revisions')
    .values({
      workspace_id: workspaceId,
      post_id: postId,
      post_version: postVersion,
      snapshot: JSON.stringify(snapshot),
      snapshot_v: SNAPSHOT_V,
      content_hash: createHash('sha256').update(canonicalJson(snapshot), 'utf8').digest(),
      content_hash_v: CONTENT_HASH_V,
      reason: input.reason,
    })
    .execute();
  return await trx
    .insertInto('revision_destinations')
    .values(
      hashed.map(({ p, hash, unsignedHash }) => ({
        workspace_id: workspaceId,
        post_id: postId,
        post_version: postVersion,
        social_account_id: p.target.socialAccountId,
        publish_type: p.target.publishType,
        variant_id: p.variantId,
        content_hash: hash,
        unsigned_hash: unsignedHash,
      })),
    )
    .returning(['social_account_id', 'publish_type', 'agent_authored'])
    .execute();
}

export async function freeze(
  trx: TenantDb,
  providers: ProviderRegistry,
  input: FreezeInput,
): Promise<Frozen[]> {
  const inspection = await inspect(trx, providers, input);
  if (inspection.details.length > 0) throw preflightFailed(inspection.details);
  if (inspection.kind === 'blocked') throw new Error('a blocked inspection always has details');
  const { snapshot, checked } = inspection;

  const hashed = await Promise.all(
    checked.map(async (entry) => ({
      ...entry,
      hash: Buffer.from(await contentHash(contentHashInput(entry.resolved))),
      unsignedHash:
        entry.resolved.destination.signature === undefined
          ? null
          : Buffer.from(await contentHash(unsignedHashInput(entry.resolved))),
    })),
  );
  const rows = await insertRevision(trx, input, snapshot, hashed);
  for (const { p, resolved } of hashed) {
    if (resolved.destination.shorten === true) {
      await enqueueShortLinks(trx, { workspaceId: input.workspaceId, id: p.target.id });
    }
  }

  return hashed.map(({ p, resolved, issues, hash }) => {
    const row = rows.find(
      (r) =>
        r.social_account_id === p.target.socialAccountId && r.publish_type === p.target.publishType,
    );
    if (row === undefined) throw new Error('revision destination missing after insert');
    return {
      id: p.target.id,
      contentHash: hash,
      signature: resolved.destination.signature ?? null,
      agentAuthored: row.agent_authored,
      preflight: issues,
      ackedCodes: [...new Set(issues.map((issue) => issue.code))].sort(),
    };
  });
}
