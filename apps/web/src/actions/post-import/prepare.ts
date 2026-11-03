import { errorCode, errorDetails } from '../../base/api/errors.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { destinationIndex } from '../../composer/compose/issues.ts';
import { m as calendarText } from '../../i18n/calendar.ts';
import type { Channel } from '../../records/channels/queries.ts';
import { parseCsv } from './csv.ts';
import { csvProblemMessage, issueText, rowProblemMessage } from './messages.ts';
import { type ImportRow, mapRecord, type RowContext, rowIndex } from './rows.ts';

export interface Problem {
  readonly line: number | null;
  readonly message: string;
}

export interface Prepared {
  readonly rows: readonly ImportRow[];
  readonly lines: readonly number[];
  readonly problems: readonly Problem[];
}

export function prepareImport(text: string, context: RowContext): Prepared {
  const parsed = parseCsv(text);
  const problems: Problem[] = parsed.problems.map((problem) => ({
    line: 'line' in problem ? problem.line : null,
    message: csvProblemMessage(problem),
  }));
  const rows: ImportRow[] = [];
  for (const record of parsed.records) {
    const mapped = mapRecord(record, context);
    if ('row' in mapped) rows.push(mapped.row);
    else {
      problems.push(
        ...mapped.problems.map((p) => ({ line: record.line, message: rowProblemMessage(p) })),
      );
    }
  }
  const lines = parsed.records.map((record) => record.line);
  return { rows, lines, problems: problems.sort(byLine) };
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
