import { createHash } from 'node:crypto';
import {
  CONTENT_HASH_V,
  canonicalJson,
  contentHash,
  type IssueCode,
  type ValidationIssue,
  validate,
} from '@kronaut/compose';
import type { DB, TenantDb } from '@kronaut/db';
import { sql, type UpdateObject } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { HttpError, type IssueDetail } from '../http/errors.ts';
import type { ProviderEntry, ProviderRegistry } from '../providers.ts';
import {
  contentHashInput,
  draftItems,
  RevisionSnapshotSchema,
  resolveDestination,
  SNAPSHOT_V,
} from '../snapshot.ts';
import { loadContent, mediaSnapshot } from './content.ts';

// A new schedule is a new publish. Checkpoints and the attempt budget belong to the previous one.
export const FRESH_PUBLISH: UpdateObject<DB, 'post_destinations'> = {
  attempt_count: 0,
  claimed_attempt_id: null,
  provider_state: sql`'{}'::jsonb`,
  last_error_code: null,
  last_error_message: null,
};

export const APPROVAL_UNBOUND: UpdateObject<DB, 'post_destinations'> = {
  approval_request_id: null,
  approval_schedule_bound: null,
  approved_scheduled_local: null,
  approved_scheduled_tz: null,
  approved_tolerance_min: null,
};

export const UNFROZEN: UpdateObject<DB, 'post_destinations'> = {
  ...FRESH_PUBLISH,
  ...APPROVAL_UNBOUND,
  frozen_at: null,
  frozen_post_version: null,
  content_hash: null,
  content_hash_v: null,
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

// compose reports no warning severity yet, so every issue blocks; acknowledgements only ever clear codes listed here.
const WARNING_CODES: ReadonlySet<IssueCode> = new Set<IssueCode>();

export type TzResolution = 'exact' | 'gap_forward' | 'overlap_earlier';

export interface Schedule {
  readonly local: Temporal.PlainDateTime;
  readonly tz: string;
  readonly at: Temporal.Instant;
  readonly resolution: TzResolution;
}

export function resolveLocal(local: Temporal.PlainDateTime, tz: string): Schedule {
  const zoned = local.toZonedDateTime(tz, { disambiguation: 'compatible' });
  let resolution: TzResolution = 'exact';
  if (!zoned.toPlainDateTime().equals(local)) {
    resolution = 'gap_forward';
  } else if (
    local.toZonedDateTime(tz, { disambiguation: 'later' }).epochNanoseconds !==
    zoned.epochNanoseconds
  ) {
    resolution = 'overlap_earlier';
  }
  return {
    local: zoned.toPlainDateTime(),
    tz: zoned.timeZoneId,
    at: zoned.toInstant(),
    resolution,
  };
}

export function scheduleAt(at: Temporal.Instant, tz: string): Schedule {
  const zoned = at.toZonedDateTimeISO(tz);
  return { local: zoned.toPlainDateTime(), tz: zoned.timeZoneId, at, resolution: 'exact' };
}

export interface FreezeTarget {
  readonly id: string;
  readonly index: number;
  readonly socialAccountId: string;
  readonly provider: string;
  readonly publishType: string;
  readonly deliveryMode: string;
  readonly settings: unknown;
  readonly variantId: string | null;
}

export interface Frozen {
  readonly id: string;
  readonly contentHash: Buffer;
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

interface Prepared {
  readonly target: FreezeTarget;
  readonly entry: ProviderEntry;
  readonly variantId: string;
  readonly settings: unknown;
}

function preflightFailed(details: readonly IssueDetail[]): HttpError {
  return new HttpError('preflight_failed', 'The post did not pass preflight.', { details });
}

type Content = Awaited<ReturnType<typeof loadContent>>;

interface Checked {
  readonly p: Prepared;
  readonly resolved: ReturnType<typeof resolveDestination>;
  readonly issues: readonly ValidationIssue[];
}

interface Hashed {
  readonly p: Prepared;
  readonly issues: readonly ValidationIssue[];
  readonly hash: Buffer;
}

function prepareTargets(
  providers: ProviderRegistry,
  input: FreezeInput,
  fallback: string | undefined,
): Prepared[] {
  const details: IssueDetail[] = [];
  const prepared: Prepared[] = [];
  for (const target of input.targets) {
    const path = `destinations.${target.index}`;
    const entry = providers.get(target.provider);
    if (entry === undefined) {
      details.push({ path, code: 'provider_unavailable' });
      continue;
    }
    const settings = entry.manifest.settings.safeParse(target.settings);
    if (!settings.success) {
      details.push({ path, code: 'settings_invalid' });
      continue;
    }
    const variantId = target.variantId ?? fallback;
    if (variantId === undefined) throw new Error(`post ${input.postId} has no default variant`);
    prepared.push({ target, entry, variantId, settings: settings.data });
  }
  if (details.length > 0) throw preflightFailed(details);
  return prepared;
}

function snapshotOf(input: FreezeInput, { variants, items, media }: Content, prepared: Prepared[]) {
  const { postId, postVersion } = input;
  const used = new Set(prepared.map((p) => p.variantId));
  return RevisionSnapshotSchema.parse({
    v: SNAPSHOT_V,
    postId,
    postVersion,
    variants: variants
      .filter((variant) => used.has(variant.id))
      .map((variant) => ({
        id: variant.id,
        isDefault: variant.is_default,
        contentLanguage: variant.content_language,
        items: items
          .filter((item) => item.variant_id === variant.id)
          .map((item) => ({
            position: item.position,
            role: item.role,
            doc: item.doc,
            docSchemaV: item.doc_schema_v,
            media: media.filter((m) => m.item_id === item.id).map(mediaSnapshot),
          })),
      })),
    destinations: prepared.map((p) => ({
      socialAccountId: p.target.socialAccountId,
      provider: p.target.provider,
      publishType: p.target.publishType,
      variantId: p.variantId,
      deliveryMode: p.target.deliveryMode,
      settings: p.settings,
    })),
  });
}

type Snapshot = ReturnType<typeof snapshotOf>;

async function accountCapabilities(trx: TenantDb, input: FreezeInput) {
  const ids = [...new Set(input.targets.map((target) => target.socialAccountId))];
  if (ids.length === 0) return new Map<string, unknown>();
  const rows = await trx
    .selectFrom('social_accounts')
    .select(['id', 'capabilities'])
    .where('workspace_id', '=', input.workspaceId)
    .where('id', 'in', ids)
    .execute();
  return new Map<string, unknown>(rows.map((row) => [row.id, row.capabilities]));
}

function preflight(
  input: FreezeInput,
  snapshot: Snapshot,
  prepared: Prepared[],
  capabilities: ReadonlyMap<string, unknown>,
): Checked[] {
  const details: IssueDetail[] = [];
  const checked = prepared.map((p) => {
    const { socialAccountId, publishType } = p.target;
    const resolved = resolveDestination(snapshot, { socialAccountId, publishType });
    const issues = validate(
      p.entry.manifest,
      publishType,
      draftItems(resolved),
      capabilities.get(socialAccountId),
    );
    for (const issue of issues) {
      if (!WARNING_CODES.has(issue.code) || !input.acknowledged.has(issue.code)) {
        details.push({ path: `destinations.${p.target.index}`, code: issue.code });
      }
    }
    return { p, resolved, issues };
  });
  if (details.length > 0) throw preflightFailed(details);
  return checked;
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
      hashed.map(({ p, hash }) => ({
        workspace_id: workspaceId,
        post_id: postId,
        post_version: postVersion,
        social_account_id: p.target.socialAccountId,
        publish_type: p.target.publishType,
        variant_id: p.variantId,
        content_hash: hash,
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
  const content = await loadContent(trx, input);
  const fallback = content.variants.find((variant) => variant.is_default)?.id;
  const prepared = prepareTargets(providers, input, fallback);
  const snapshot = snapshotOf(input, content, prepared);
  const checked = preflight(input, snapshot, prepared, await accountCapabilities(trx, input));

  const hashed = await Promise.all(
    checked.map(async ({ p, resolved, issues }) => ({
      p,
      issues,
      hash: Buffer.from(await contentHash(contentHashInput(resolved))),
    })),
  );
  const rows = await insertRevision(trx, input, snapshot, hashed);

  return hashed.map(({ p, issues, hash }) => {
    const row = rows.find(
      (r) =>
        r.social_account_id === p.target.socialAccountId && r.publish_type === p.target.publishType,
    );
    if (row === undefined) throw new Error('revision destination missing after insert');
    return {
      id: p.target.id,
      contentHash: hash,
      agentAuthored: row.agent_authored,
      preflight: issues,
      ackedCodes: [...new Set(issues.map((issue) => issue.code))].sort(),
    };
  });
}
