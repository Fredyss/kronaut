import { type IssueCode, type ValidationIssue, validate, validateSettings } from '@kronaut/compose';
import type { TenantDb } from '@kronaut/db';
import { HttpError, type IssueDetail } from '../../../base/http/errors.ts';
import type { ProviderEntry, ProviderRegistry } from '../../../base/providers/providers.ts';
import {
  draftItems,
  RevisionSnapshotSchema,
  resolveDestination,
  SNAPSHOT_V,
} from '../../../steps/publish/snapshot.ts';
import { type Accounts, loadAccounts, shortenField, signatureField } from './accounts.ts';
import { loadContent, mediaSnapshot } from './content.ts';
import type { FreezeInput, FreezeTarget } from './freeze.ts';

// compose reports no warning severity yet, so every issue blocks; acknowledgements only ever clear codes listed here.
const WARNING_CODES: ReadonlySet<IssueCode> = new Set<IssueCode>();

interface Prepared {
  readonly target: FreezeTarget;
  readonly entry: ProviderEntry;
  readonly variantId: string;
  readonly settings: unknown;
}

export function preflightFailed(details: readonly IssueDetail[]): HttpError {
  return new HttpError('preflight_failed', 'The post did not pass preflight.', { details });
}

type Content = Awaited<ReturnType<typeof loadContent>>;

export interface Checked {
  readonly p: Prepared;
  readonly resolved: ReturnType<typeof resolveDestination>;
  readonly issues: readonly ValidationIssue[];
}

interface PreparedTargets {
  readonly prepared: Prepared[];
  readonly details: IssueDetail[];
}

function prepareTargets(
  providers: ProviderRegistry,
  input: FreezeInput,
  fallback: string | undefined,
): PreparedTargets {
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
  return { prepared, details };
}

function snapshotOf(
  input: FreezeInput,
  { variants, items, media }: Content,
  prepared: Prepared[],
  accounts: Accounts,
) {
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
      ...signatureField(p.target, accounts),
      ...shortenField(p.target, accounts),
    })),
  });
}

export type Snapshot = ReturnType<typeof snapshotOf>;

function issuePath(index: number, issue: ValidationIssue): string {
  const path = `destinations.${index}`;
  return issue.field === undefined ? path : `${path}.settings.${issue.field}`;
}

function preflight(
  input: FreezeInput,
  snapshot: Snapshot,
  prepared: Prepared[],
  accounts: Accounts,
): { readonly checked: Checked[]; readonly details: IssueDetail[] } {
  const details: IssueDetail[] = [];
  const checked = prepared.map((p) => {
    const { socialAccountId, publishType } = p.target;
    const resolved = resolveDestination(snapshot, { socialAccountId, publishType });
    const issues = [
      ...validate(
        p.entry.manifest,
        publishType,
        draftItems(resolved),
        accounts.get(socialAccountId)?.capabilities,
      ),
      ...validateSettings(p.entry.manifest, p.settings),
    ];
    for (const issue of issues) {
      if (!WARNING_CODES.has(issue.code) || !input.acknowledged.has(issue.code)) {
        details.push({ path: issuePath(p.target.index, issue), code: issue.code });
      }
    }
    return { p, resolved, issues };
  });
  return { checked, details };
}

export type Inspection =
  | { readonly kind: 'blocked'; readonly details: readonly IssueDetail[] }
  | {
      readonly kind: 'checked';
      readonly details: readonly IssueDetail[];
      readonly snapshot: Snapshot;
      readonly checked: readonly Checked[];
    };

export async function inspect(
  trx: TenantDb,
  providers: ProviderRegistry,
  input: FreezeInput,
): Promise<Inspection> {
  const content = await loadContent(trx, input);
  const fallback = content.variants.find((variant) => variant.is_default)?.id;
  const { prepared, details: blocked } = prepareTargets(providers, input, fallback);
  if (blocked.length > 0) return { kind: 'blocked', details: blocked };
  const accounts = await loadAccounts(trx, input);
  const snapshot = snapshotOf(input, content, prepared, accounts);
  return { kind: 'checked', snapshot, ...preflight(input, snapshot, prepared, accounts) };
}
