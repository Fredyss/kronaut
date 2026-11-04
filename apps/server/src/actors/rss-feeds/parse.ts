import { createHash } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { Temporal } from 'temporal-polyfill';
import { cutSummary, decodeEntities, htmlToText } from './plain-text.ts';

const MAX_ITEMS = 1000;
const ATTRIBUTE = '@_';
const TEXT = '#text';
const LISTS: ReadonlySet<string> = new Set(['item', 'entry', 'link']);

export interface FeedItem {
  readonly key: Buffer;
  readonly title: string;
  readonly link: string | null;
  readonly summary: string;
  readonly at: Temporal.Instant | null;
  readonly index: number;
}

export class FeedInvalid extends Error {
  constructor() {
    super('feed_invalid');
    this.name = 'FeedInvalid';
  }
}

// Without a DOCTYPE no entity can be declared, so only the five predefined ones and character
// references remain; HTML entities are decoded later, in the plain text, never by the parser.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ATTRIBUTE,
  textNodeName: TEXT,
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: true,
  htmlEntities: false,
  ignoreDeclaration: true,
  ignorePiTags: true,
  isArray: (name) => LISTS.has(name),
});

type Node = unknown;

function skipTo(xml: string, from: number, end: string): number {
  const at = xml.indexOf(end, from);
  return at === -1 ? xml.length : at + end.length;
}

function hasDoctype(xml: string): boolean {
  let at = xml.indexOf('<!');
  while (at !== -1) {
    if (xml.startsWith('<!--', at)) at = skipTo(xml, at + 4, '-->');
    else if (xml.startsWith('<![CDATA[', at)) at = skipTo(xml, at + 9, ']]>');
    else return true;
    at = xml.indexOf('<!', at);
  }
  return false;
}

function record(node: Node): Record<string, Node> | null {
  return typeof node === 'object' && node !== null && !Array.isArray(node)
    ? (node as Record<string, Node>)
    : null;
}

function textOf(node: Node): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  const fields = record(node);
  if (fields === null) return '';
  return Object.entries(fields)
    .filter(([name]) => !name.startsWith(ATTRIBUTE))
    .map(([, value]) => textOf(value))
    .join(' ');
}

function attribute(node: Node, name: string): string | null {
  const value = record(node)?.[`${ATTRIBUTE}${name}`];
  return typeof value === 'string' ? value : null;
}

function resolveLink(raw: string | null, base: string): string | null {
  if (raw === null) return null;
  const url = URL.parse(decodeEntities(raw.trim()), base);
  return url !== null && (url.protocol === 'https:' || url.protocol === 'http:') ? url.href : null;
}

function instantOf(raw: string): Temporal.Instant | null {
  const value = raw.trim();
  try {
    return Temporal.Instant.from(value);
  } catch {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : Temporal.Instant.fromEpochMilliseconds(ms);
  }
}

function list(node: Node): Node[] {
  if (node === undefined) return [];
  return Array.isArray(node) ? node : [node];
}

interface RawItem {
  readonly id: string;
  readonly title: string;
  readonly link: string | null;
  readonly summary: string;
  readonly date: string;
}

function rssItem(node: Node): RawItem {
  const fields = record(node) ?? {};
  return {
    id: textOf(fields.guid),
    title: textOf(fields.title),
    link: list(fields.link).map(textOf)[0] ?? null,
    summary: textOf(fields.description),
    date: textOf(fields.pubDate),
  };
}

function atomLink(node: Node): string | null {
  const links = list(node);
  const alternate = links.find((link) => {
    const rel = attribute(link, 'rel');
    return rel === null || rel === 'alternate';
  });
  return attribute(alternate ?? links[0], 'href');
}

function atomItem(node: Node): RawItem {
  const fields = record(node) ?? {};
  return {
    id: textOf(fields.id),
    title: textOf(fields.title),
    link: atomLink(fields.link),
    summary: textOf(fields.summary ?? fields.content),
    date: textOf(fields.published ?? fields.updated),
  };
}

function rawItems(document: Record<string, Node>): RawItem[] {
  const rss = record(record(document.rss)?.channel);
  if (rss !== null) return list(rss.item).map(rssItem);
  const atom = record(document.feed);
  if (atom !== null) return list(atom.entry).map(atomItem);
  throw new FeedInvalid();
}

function itemOf(raw: RawItem, base: string, index: number): FeedItem | null {
  const title = htmlToText(raw.title);
  const link = resolveLink(raw.link, base);
  const id = raw.id.trim();
  const keyText = id === '' ? link : id;
  if ((title === '' && link === null) || keyText === null) return null;
  return {
    key: createHash('sha256').update(keyText, 'utf8').digest(),
    title,
    link,
    summary: cutSummary(htmlToText(raw.summary)),
    at: raw.date.trim() === '' ? null : instantOf(raw.date),
    index,
  };
}

export function parseFeed(xml: string, base: string): FeedItem[] {
  if (hasDoctype(xml) || XMLValidator.validate(xml) !== true) throw new FeedInvalid();
  const document = record(parser.parse(xml));
  if (document === null) throw new FeedInvalid();
  const items: FeedItem[] = [];
  const keys = new Set<string>();
  for (const raw of rawItems(document)) {
    const item = itemOf(raw, base, items.length);
    if (item === null || keys.has(item.key.toString('hex'))) continue;
    keys.add(item.key.toString('hex'));
    items.push(item);
    if (items.length === MAX_ITEMS) break;
  }
  return items;
}
