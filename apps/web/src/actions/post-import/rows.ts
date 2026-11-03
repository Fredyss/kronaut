import type { PostsImportData } from '@kronaut/sdk';
import { choiceFor } from '../../composer/compose/content/choice.ts';
import type { Channel } from '../../records/channels/queries.ts';
import { textToParagraphs } from '../../records/posts/doc.ts';
import type { CsvRecord } from './csv.ts';
import { localDateTime } from './when.ts';

export type ImportRow = PostsImportData['body']['rows'][number];
type RowSchedule = ImportRow['schedule'];
type RowDestination = ImportRow['destinations'][number];

export type RowProblem =
  | { readonly kind: 'text_empty' }
  | { readonly kind: 'handle_unknown'; readonly handle: string }
  | { readonly kind: 'handle_ambiguous'; readonly handle: string }
  | { readonly kind: 'channel_inactive'; readonly channel: Channel }
  | { readonly kind: 'channel_text_only'; readonly channel: Channel }
  | { readonly kind: 'no_channels' }
  | { readonly kind: 'date_invalid' }
  | { readonly kind: 'date_half' };

export interface RowContext {
  readonly channels: readonly Channel[];
  readonly defaults: ReadonlySet<string>;
  readonly tz: string;
}

export type MappedRow = { readonly row: ImportRow } | { readonly problems: readonly RowProblem[] };

const NO_MEDIA = { images: [], video: false } as const;

function handleKey(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

function usable(channel: Channel): boolean {
  return channel.status === 'active' && choiceFor(channel, NO_MEDIA).kind === 'ok';
}

function unusableProblem(channel: Channel): RowProblem {
  return channel.status === 'active'
    ? { kind: 'channel_text_only', channel }
    : { kind: 'channel_inactive', channel };
}

function matchHandle(handle: string, channels: readonly Channel[]): Channel | RowProblem {
  const key = handleKey(handle);
  const matches = channels.filter((c) => c.handle !== null && handleKey(c.handle) === key);
  const fit = matches.filter(usable);
  const [only] = fit;
  if (fit.length > 1) return { kind: 'handle_ambiguous', handle };
  if (only !== undefined) return only;
  const [unfit] = matches;
  return unfit === undefined ? { kind: 'handle_unknown', handle } : unusableProblem(unfit);
}

function namedChannels(
  column: string,
  channels: readonly Channel[],
  problems: RowProblem[],
): Channel[] {
  const found: Channel[] = [];
  for (const handle of column.split(/[\s,;]+/).filter((part) => part !== '')) {
    const matched = matchHandle(handle, channels);
    if ('kind' in matched) problems.push(matched);
    else if (!found.includes(matched)) found.push(matched);
  }
  return found;
}

function destinationOf(channel: Channel, problems: RowProblem[]): RowDestination | null {
  const choice = choiceFor(channel, NO_MEDIA);
  if (channel.status !== 'active' || choice.kind !== 'ok') {
    problems.push(unusableProblem(channel));
    return null;
  }
  return { accountId: channel.id, publishType: choice.publishType };
}

function destinationsOf(column: string, context: RowContext, problems: RowProblem[]) {
  const before = problems.length;
  const named =
    column.trim() === ''
      ? context.channels.filter((channel) => context.defaults.has(channel.id))
      : namedChannels(column, context.channels, problems);
  if (named.length === 0 && problems.length === before) problems.push({ kind: 'no_channels' });
  return named.flatMap((channel) => destinationOf(channel, problems) ?? []);
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

export function mapRecord(record: CsvRecord, context: RowContext): MappedRow {
  const problems: RowProblem[] = [];
  const text = record.values.text.trim();
  if (text === '') problems.push({ kind: 'text_empty' });
  const destinations = destinationsOf(record.values.channels, context, problems);
  const schedule = scheduleOf(record, context.tz, problems);
  if (problems.length > 0 || schedule === null) return { problems };
  const doc = { type: 'doc', content: textToParagraphs(text) };
  return { row: { items: [{ doc }], destinations, schedule } };
}

const ROW_PATH = /^body\.rows\.(\d+)(?:\.|$)/;

export function rowIndex(path: string): number | null {
  const match = ROW_PATH.exec(path);
  return match?.[1] === undefined ? null : Number(match[1]);
}
