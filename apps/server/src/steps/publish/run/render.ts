import { type DraftItem, replaceLinks, type ValidationIssue, validate } from '@kronaut/compose';
import type { TenantDb } from '@kronaut/db';
import type { ProviderEntry } from '../../../base/providers/providers.ts';
import type { DestinationJob } from '../../../infrastructure/jobs/jobs.ts';
import { readyLinks } from '../../../records/short-links/links.ts';
import { draftItems, publishItems, type ResolvedDestination } from '../snapshot.ts';

export interface RenderSource {
  readonly resolved: ResolvedDestination;
  readonly entry: ProviderEntry;
  readonly publishType: string;
  readonly capabilities: unknown;
}

function issueKey(issue: ValidationIssue): string {
  return `${issue.itemIndex ?? ''}:${issue.code}`;
}

function brokenItems(source: RenderSource, long: DraftItem[], short: DraftItem[]): Set<number> {
  const check = (items: DraftItem[]) =>
    validate(source.entry.manifest, source.publishType, items, source.capabilities);
  const before = new Set(check(long).map(issueKey));
  const broken = new Set<number>();
  for (const issue of check(short)) {
    if (issue.itemIndex !== undefined && !before.has(issueKey(issue))) broken.add(issue.itemIndex);
  }
  return broken;
}

// The long link stays the content: an item whose short links would break its limits keeps them long.
export async function renderedTexts(
  trx: TenantDb,
  job: DestinationJob,
  source: RenderSource,
): Promise<ReadonlyMap<number, string>> {
  const items = publishItems(source.resolved);
  const long = new Map(items.map((item) => [item.position, item.text]));
  if (source.resolved.destination.shorten !== true) return long;
  const links = await readyLinks(trx, { workspaceId: job.workspaceId, destinationId: job.id });
  if (links.size === 0) return long;
  const drafts = draftItems(source.resolved);
  const short = drafts.map((item) => ({
    ...item,
    text: replaceLinks(item.text, (link) => links.get(link) ?? link),
  }));
  const broken = brokenItems(source, drafts, short);
  return new Map(
    items.map((item, index) => [
      item.position,
      broken.has(index) ? item.text : (short[index]?.text ?? item.text),
    ]),
  );
}
