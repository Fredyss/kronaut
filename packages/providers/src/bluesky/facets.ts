import type { BaseContext } from '@kronaut/core';
import * as z from 'zod';
import { normalizeHandle, resolveHandle } from './identity.ts';

const LINK = 'app.bsky.richtext.facet#link';
const MENTION = 'app.bsky.richtext.facet#mention';
const TAG = 'app.bsky.richtext.facet#tag';
const TAG_MAX_GRAPHEMES = 64;

const URL_PATTERN = /(?<=^|[\s(])https?:\/\/[^\s<>"]+/giu;
const MENTION_PATTERN = /(?<=^|[\s(])@([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)/giu;
const TAG_PATTERN = /(?<=^|\s)#([^\s#]+)/gu;
const TRAILING_URL_PUNCTUATION = /[.,;:!?)]$/u;
const TRAILING_TAG_PUNCTUATION = /\p{P}+$/u;

export const facetSchema = z.object({
  index: z.object({
    byteStart: z.number().int().nonnegative(),
    byteEnd: z.number().int().nonnegative(),
  }),
  features: z.tuple([
    z.discriminatedUnion('$type', [
      z.object({ $type: z.literal(LINK), uri: z.string() }),
      z.object({ $type: z.literal(MENTION), did: z.string() }),
      z.object({ $type: z.literal(TAG), tag: z.string() }),
    ]),
  ]),
});
export type Facet = z.infer<typeof facetSchema>;
type Feature = Facet['features'][0];

interface Span {
  readonly start: number;
  readonly end: number;
}

interface Candidate extends Span {
  readonly feature: Feature | { readonly handle: string };
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function graphemeCount(text: string): number {
  let count = 0;
  for (const _ of graphemes.segment(text)) count += 1;
  return count;
}

export function utf8Length(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

function count(text: string, char: string): number {
  return text.split(char).length - 1;
}

function trimUrl(raw: string): string {
  let url = raw;
  while (TRAILING_URL_PUNCTUATION.test(url)) {
    if (url.endsWith(')') && count(url, '(') >= count(url, ')')) break;
    url = url.slice(0, -1);
  }
  return url;
}

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

function links(text: string): Candidate[] {
  const out: Candidate[] = [];
  for (const match of text.matchAll(URL_PATTERN)) {
    const uri = trimUrl(match[0]);
    if (!isWebUrl(uri)) continue;
    out.push({ start: match.index, end: match.index + uri.length, feature: { $type: LINK, uri } });
  }
  return out;
}

function mentions(text: string): Candidate[] {
  const out: Candidate[] = [];
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const handle = normalizeHandle(match[1] ?? '');
    if (handle === undefined) continue;
    out.push({ start: match.index, end: match.index + match[0].length, feature: { handle } });
  }
  return out;
}

function tags(text: string): Candidate[] {
  const out: Candidate[] = [];
  for (const match of text.matchAll(TAG_PATTERN)) {
    const tag = (match[1] ?? '').replace(TRAILING_TAG_PUNCTUATION, '');
    if (tag === '' || /^\d+$/u.test(tag) || graphemeCount(tag) > TAG_MAX_GRAPHEMES) continue;
    out.push({
      start: match.index,
      end: match.index + 1 + tag.length,
      feature: { $type: TAG, tag },
    });
  }
  return out;
}

function overlaps(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end;
}

export function detectFacets(text: string): Candidate[] {
  const urls = links(text);
  const others = [...mentions(text), ...tags(text)].filter(
    (candidate) => !urls.some((url) => overlaps(url, candidate)),
  );
  return [...urls, ...others].sort((a, b) => a.start - b.start);
}

async function resolveAll(
  ctx: BaseContext,
  handles: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const resolved = new Map<string, string>();
  for (const handle of new Set(handles)) {
    try {
      resolved.set(handle, await resolveHandle(ctx, handle));
    } catch {}
  }
  return resolved;
}

export async function buildFacets(ctx: BaseContext, text: string): Promise<Facet[]> {
  const candidates = detectFacets(text);
  const dids = await resolveAll(
    ctx,
    candidates.flatMap(({ feature }) => ('handle' in feature ? [feature.handle] : [])),
  );
  const facets: Facet[] = [];
  for (const { start, end, feature } of candidates) {
    let resolved: Feature;
    if ('handle' in feature) {
      const did = dids.get(feature.handle);
      if (did === undefined) continue;
      resolved = { $type: MENTION, did };
    } else resolved = feature;
    facets.push({
      index: {
        byteStart: utf8Length(text.slice(0, start)),
        byteEnd: utf8Length(text.slice(0, end)),
      },
      features: [resolved],
    });
  }
  return facets;
}
