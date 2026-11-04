import { attribute, list, type Node, record, textOf } from './nodes.ts';
import { decodeEntities, htmlToText } from './plain-text.ts';

const ALT_MAX = 1500;

export interface FeedImage {
  readonly url: string;
  readonly alt: string | null;
}

interface Candidate {
  readonly url: string | null;
  readonly description: Node;
}

function isImageType(node: Node): boolean {
  return attribute(node, 'type')?.trim().toLowerCase().startsWith('image/') ?? false;
}

function mediaContents(fields: Record<string, Node>): Node[] {
  const groups = list(fields['media:group']).map((group) => record(group) ?? {});
  return [fields, ...groups].flatMap((holder) => list(holder['media:content']));
}

function mediaContent(fields: Record<string, Node>): Candidate | null {
  const found = mediaContents(fields).find(
    (node) => attribute(node, 'medium') === 'image' || isImageType(node),
  );
  if (found === undefined) return null;
  return { url: attribute(found, 'url'), description: record(found)?.['media:description'] };
}

function thumbnail(fields: Record<string, Node>): Candidate | null {
  const groups = list(fields['media:group']).map((group) => record(group) ?? {});
  const found = [fields, ...groups].flatMap((holder) => list(holder['media:thumbnail']))[0];
  return found === undefined ? null : { url: attribute(found, 'url'), description: undefined };
}

function enclosure(fields: Record<string, Node>): Candidate | null {
  const rss = list(fields.enclosure).find(isImageType);
  if (rss !== undefined) return { url: attribute(rss, 'url'), description: undefined };
  const atom = list(fields.link).find(
    (link) => attribute(link, 'rel') === 'enclosure' && isImageType(link),
  );
  return atom === undefined ? null : { url: attribute(atom, 'href'), description: undefined };
}

function altOf(candidate: Candidate, fields: Record<string, Node>): string | null {
  const groups = list(fields['media:group']).map((group) => record(group) ?? {});
  const node = [candidate.description, ...groups.map((group) => group['media:description'])]
    .concat(fields['media:description'])
    .find((value) => value !== undefined);
  const text = htmlToText(textOf(node));
  return text === '' ? null : [...text].slice(0, ALT_MAX).join('');
}

export function imageOf(node: Node, base: string): FeedImage | null {
  const fields = record(node) ?? {};
  const candidate = mediaContent(fields) ?? thumbnail(fields) ?? enclosure(fields);
  if (candidate === null || candidate.url === null) return null;
  const url = URL.parse(decodeEntities(candidate.url.trim()), base);
  if (url === null || url.protocol !== 'https:') return null;
  return { url: url.href, alt: altOf(candidate, fields) };
}
