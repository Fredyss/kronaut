import { errorCode, errorDetails } from '../../base/api/errors.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { destinationIndex } from '../../composer/compose/issues.ts';
import { m as calendarText } from '../../i18n/calendar.ts';
import type { Channel } from '../../records/channels/queries.ts';
import { parseCsv } from './csv.ts';
import { distinctUrls } from './links.ts';
import type { MediaResult } from './media-fetch.ts';
import { finishRow } from './media-rows.ts';
import { csvProblemMessage, fileMediaMessage, issueText, rowProblemMessage } from './messages.ts';
import {
  type Draft,
  type ImportRow,
  mapRecord,
  type RowContext,
  type RowProblem,
  rowIndex,
} from './rows.ts';

export interface Problem {
  readonly line: number | null;
  readonly message: string;
}

export interface Prepared {
  readonly rows: readonly ImportRow[];
  readonly lines: readonly number[];
  readonly problems: readonly Problem[];
}

export interface Drafted {
  readonly drafts: readonly Draft[];
  readonly lines: readonly number[];
  readonly urls: readonly string[];
  readonly problems: readonly Problem[];
}

function rowProblems(line: number, problems: readonly RowProblem[]): Problem[] {
  return problems.map((problem) => ({ line, message: rowProblemMessage(problem) }));
}

export function draftImport(text: string, context: RowContext): Drafted {
  const parsed = parseCsv(text);
  const problems: Problem[] = parsed.problems.map((problem) => ({
    line: 'line' in problem ? problem.line : null,
    message: csvProblemMessage(problem),
  }));
  const drafts: Draft[] = [];
  for (const record of parsed.records) {
    const mapped = mapRecord(record, context);
    if ('draft' in mapped) drafts.push(mapped.draft);
    else problems.push(...rowProblems(record.line, mapped.problems));
  }
  const lines = parsed.records.map((record) => record.line);
  const links = distinctUrls(drafts.map((draft) => draft.urls));
  if ('kind' in links) problems.push({ line: null, message: fileMediaMessage(links) });
  const urls = 'urls' in links ? links.urls : [];
  return { drafts, lines, urls, problems: problems.sort(byLine) };
}

export function mediaUrls(drafted: Drafted | null): readonly string[] | null {
  if (drafted === null || drafted.problems.length > 0) return null;
  return drafted.urls;
}

export function finishImport(
  drafted: Drafted,
  results: ReadonlyMap<string, MediaResult>,
  context: RowContext,
): Prepared | null {
  const { lines } = drafted;
  if (drafted.problems.length > 0) return { rows: [], lines, problems: drafted.problems };
  if (drafted.drafts.some((draft) => draft.urls.some((url) => !results.has(url)))) return null;
  const rows: ImportRow[] = [];
  const problems: Problem[] = [];
  for (const draft of drafted.drafts) {
    const finished = finishRow(draft, results, context);
    if ('row' in finished) rows.push(finished.row);
    else problems.push(...rowProblems(draft.line, finished.problems));
  }
  return { rows, lines, problems };
}

function byLine(a: Problem, b: Problem): number {
  return (a.line ?? 0) - (b.line ?? 0);
}

function channelName(path: string, row: ImportRow | undefined, channels: readonly Channel[]) {
  const index = destinationIndex(path);
  const id = index === null ? undefined : row?.destinations[index]?.accountId;
  return channels.find((channel) => channel.id === id)?.displayName ?? null;
}

function wholeFileMessage(code: string): string {
  return code === 'payload_too_large'
    ? calendarText.calendar_import_error_too_large()
    : apiErrorMessage(code);
}

export function serverProblems(
  error: unknown,
  sent: Pick<Prepared, 'rows' | 'lines'>,
  channels: readonly Channel[],
): Problem[] {
  const details = errorDetails(error);
  if (details.length === 0) return [{ line: null, message: wholeFileMessage(errorCode(error)) }];
  return details.map((detail) => {
    const index = rowIndex(detail.path);
    const problem = issueText(detail.code);
    const channel = channelName(
      detail.path,
      index === null ? undefined : sent.rows[index],
      channels,
    );
    return {
      line: index === null ? null : (sent.lines[index] ?? null),
      message:
        channel === null
          ? problem
          : calendarText.calendar_import_issue_channel({ channel, problem }),
    };
  });
}
