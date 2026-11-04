import type { MediaFacts } from '../../composer/compose/content/choice.ts';
import { hostOf } from './links.ts';
import type { FetchedAsset, MediaResult } from './media-fetch.ts';
import {
  type Draft,
  destinationsOf,
  type ImportRow,
  type RowContext,
  type RowProblem,
} from './rows.ts';

export type FinishedRow =
  | { readonly row: ImportRow }
  | { readonly problems: readonly RowProblem[] };

type Results = ReadonlyMap<string, MediaResult>;

function assetsOf(urls: readonly string[], results: Results, problems: RowProblem[]) {
  const assets: FetchedAsset[] = [];
  for (const url of urls) {
    const result = results.get(url) ?? { kind: 'failed' };
    if (result.kind === 'ready') assets.push(result.asset);
    else if (result.kind === 'rejected')
      problems.push({ kind: 'media_rejected', host: hostOf(url) });
    else problems.push({ kind: 'media_failed', host: hostOf(url) });
  }
  return assets;
}

function factsOf(assets: readonly FetchedAsset[], problems: RowProblem[]): MediaFacts | null {
  const videos = assets.filter((asset) => asset.kind === 'video').length;
  if (videos > 1 || (videos === 1 && assets.length > 1)) {
    problems.push({ kind: 'media_mix' });
    return null;
  }
  const images = assets.map((asset) => ({ size: asset.bytes ?? 0, type: asset.mime ?? '' }));
  return videos === 1 ? { images: [], video: true } : { images, video: false };
}

export function finishRow(draft: Draft, results: Results, context: RowContext): FinishedRow {
  const problems: RowProblem[] = [];
  const assets = assetsOf(draft.urls, results, problems);
  const facts = problems.length > 0 ? null : factsOf(assets, problems);
  if (facts === null) return { problems };
  const destinations = destinationsOf(draft.channels, context, facts, problems);
  if (problems.length > 0) return { problems };
  const media = assets.map((asset) => ({ mediaId: asset.id, altText: null }));
  const item = media.length === 0 ? { doc: draft.doc } : { doc: draft.doc, media };
  return { row: { items: [item], destinations, schedule: draft.schedule } };
}
