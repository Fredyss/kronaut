import type { PostsImportData } from '@kronaut/sdk';
import { choiceFor, type MediaFacts } from '../../composer/compose/content/choice.ts';
import type { Channel } from '../../records/channels/queries.ts';
import { textToParagraphs } from '../../records/posts/doc.ts';
import type { CsvRecord } from './csv.ts';
import { type LinkProblem, parseLinks } from './links.ts';
import { localDateTime } from './when.ts';

export type ImportRow = PostsImportData['body']['rows'][number];
type RowSchedule = ImportRow['schedule'];
type RowDestination = ImportRow['destinations'][number];
type RowDoc = ImportRow['items'][number]['doc'];

export type RowProblem =
  | { readonly kind: 'text_empty' }
  | { readonly kind: 'handle_unknown'; readonly handle: string }
  | { readonly kind: 'handle_ambiguous'; readonly handle: string }
  | { readonly kind: 'channel_inactive'; readonly channel: Channel }
  | { readonly kind: 'channel_text_only'; readonly channel: Channel }
  | { readonly kind: 'channel_media'; readonly channel: Channel }
  | { readonly kind: 'no_channels' }
  | { readonly kind: 'date_invalid' }
  | { readonly kind: 'date_half' }
  | { readonly kind: 'media_failed'; readonly host: string }
  | { readonly kind: 'media_rejected'; readonly host: string }
  | { readonly kind: 'media_mix' }
  | LinkProblem;

export interface RowContext {
  readonly channels: readonly Channel[];
  readonly defaults: ReadonlySet<string>;
  readonly tz: string;
}

export interface Draft {
  readonly line: number;
  readonly doc: RowDoc;
  readonly channels: string;
  readonly schedule: RowSchedule;
  readonly urls: readonly string[];
}

export type DraftedRow = { readonly draft: Draft } | { readonly problems: readonly RowProblem[] };

export const NO_MEDIA: MediaFacts = { images: [], video: false };

function handleKey(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

function handlesOf(column: string): string[] {
  return column.split(/[\s,;]+/).filter((part) => part !== '');
}

function usable(channel: Channel, facts: MediaFacts): boolean {
  return channel.status === 'active' && choiceFor(channel, facts).kind === 'ok';
}

function unusableProblem(channel: Channel, facts: MediaFacts): RowProblem {
  if (channel.status !== 'active') return { kind: 'channel_inactive', channel };
  return facts.video || facts.images.length > 0
    ? { kind: 'channel_media', channel }
    : { kind: 'channel_text_only', channel };
}

function withHandle(handle: string, channels: readonly Channel[]): Channel[] {
  const key = handleKey(handle);
  return channels.filter((c) => c.handle !== null && handleKey(c.handle) === key);
}

function matchHandle(
  handle: string,
  channels: readonly Channel[],
  facts: MediaFacts,
): Channel | RowProblem {
  const matches = withHandle(handle, channels);
  const fit = matches.filter((channel) => usable(channel, facts));
  const [only] = fit;
  if (fit.length > 1) return { kind: 'handle_ambiguous', handle };
  if (only !== undefined) return only;
  const [unfit] = matches;
  return unfit === undefined ? { kind: 'handle_unknown', handle } : unusableProblem(unfit, facts);
}

function namedChannels(
  column: string,
  context: RowContext,
  facts: MediaFacts,
  problems: RowProblem[],
) {
  const found: Channel[] = [];
  for (const handle of handlesOf(column)) {
    const matched = matchHandle(handle, context.channels, facts);
    if ('kind' in matched) problems.push(matched);
    else if (!found.includes(matched)) found.push(matched);
  }
  return found;
}

function destinationOf(channel: Channel, facts: MediaFacts, problems: RowProblem[]) {
  const choice = choiceFor(channel, facts);
  if (channel.status !== 'active' || choice.kind !== 'ok') {
    problems.push(unusableProblem(channel, facts));
    return null;
  }
  return { accountId: channel.id, publishType: choice.publishType };
}

function defaultChannels(context: RowContext): Channel[] {
  return context.channels.filter((channel) => context.defaults.has(channel.id));
}

export function destinationsOf(
  column: string,
  context: RowContext,
  facts: MediaFacts,
  problems: RowProblem[],
): RowDestination[] {
  const before = problems.length;
  const named =
    column.trim() === ''
      ? defaultChannels(context)
      : namedChannels(column, context, facts, problems);
  if (named.length === 0 && problems.length === before) problems.push({ kind: 'no_channels' });
  return named.flatMap((channel) => destinationOf(channel, facts, problems) ?? []);
}

function checkHandles(column: string, context: RowContext, problems: RowProblem[]): void {
  const handles = handlesOf(column);
  const unknown = handles.filter((handle) => withHandle(handle, context.channels).length === 0);
  problems.push(...unknown.map((handle) => ({ kind: 'handle_unknown' as const, handle })));
  const none = column.trim() === '' ? defaultChannels(context).length === 0 : handles.length === 0;
  if (none) problems.push({ kind: 'no_channels' });
}

function scheduleOf(record: CsvRecord, tz: string, problems: RowProblem[]): RowSchedule | null {
  const date = record.values.date.trim();
  const time = record.values.time.trim();
  if (date === '' && time === '') return { mode: 'queue' };
  if (date === '' || time === '') {
    problems.push({ kind: 'date_half' });
    return null;
  }
  const local = localDateTime(date, time);
  if (local === null) {
    problems.push({ kind: 'date_invalid' });
    return null;
  }
  return { mode: 'instant', scheduleLocal: local.toString(), scheduleTz: tz };
}

export function mapRecord(record: CsvRecord, context: RowContext): DraftedRow {
  const problems: RowProblem[] = [];
  const text = record.values.text.trim();
  if (text === '') problems.push({ kind: 'text_empty' });
  const links = parseLinks(record.values.media);
  if ('kind' in links) problems.push(links);
  const { channels } = record.values;
  if (record.values.media.trim() === '') destinationsOf(channels, context, NO_MEDIA, problems);
  else checkHandles(channels, context, problems);
  const schedule = scheduleOf(record, context.tz, problems);
  if (problems.length > 0 || schedule === null) return { problems };
  const doc = { type: 'doc', content: textToParagraphs(text) };
  const urls = 'kind' in links ? [] : links.urls;
  return { draft: { line: record.line, doc, channels, schedule, urls } };
}

const ROW_PATH = /^body\.rows\.(\d+)(?:\.|$)/;

export function rowIndex(path: string): number | null {
  const match = ROW_PATH.exec(path);
  return match?.[1] === undefined ? null : Number(match[1]);
}
