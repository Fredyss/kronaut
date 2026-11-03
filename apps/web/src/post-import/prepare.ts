import { errorCode, errorDetails } from '../api/errors.ts';
import { issueMessage } from '../compose/issues.ts';
import { apiErrorMessage } from '../locale/i18n.ts';
import { parseCsv } from './csv.ts';
import { csvProblemMessage, rowProblemMessage } from './messages.ts';
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

export function serverProblems(error: unknown, lines: readonly number[]): Problem[] {
  const details = errorDetails(error);
  if (details.length === 0) return [{ line: null, message: apiErrorMessage(errorCode(error)) }];
  return details.map((detail) => {
    const index = rowIndex(detail.path);
    return {
      line: index === null ? null : (lines[index] ?? null),
      message: issueMessage(detail.code),
    };
  });
}
