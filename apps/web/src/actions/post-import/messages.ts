import { issueMessage } from '../../composer/compose/issues.ts';
import { m as calendarText } from '../../i18n/calendar.ts';
import { statusLabel } from '../../records/channels/status-label.ts';
import type { CsvProblem } from './csv.ts';
import type { RowProblem } from './rows.ts';

export function csvProblemMessage(problem: CsvProblem): string {
  switch (problem.kind) {
    case 'empty':
      return calendarText.calendar_import_error_empty();
    case 'unclosed_quote':
      return calendarText.calendar_import_error_quote();
    case 'unknown_column':
      return calendarText.calendar_import_error_column({ name: problem.name });
    case 'duplicate_column':
      return calendarText.calendar_import_error_column_twice({ name: problem.name });
    case 'missing_text':
      return calendarText.calendar_import_error_text_column();
    case 'too_many_rows':
      return calendarText.calendar_import_error_too_many({ count: problem.max });
    case 'extra_fields':
      return calendarText.calendar_import_error_fields();
  }
}

export function rowProblemMessage(problem: RowProblem): string {
  switch (problem.kind) {
    case 'text_empty':
      return calendarText.calendar_import_error_text();
    case 'handle_unknown':
      return calendarText.calendar_import_error_handle({ handle: problem.handle });
    case 'handle_ambiguous':
      return calendarText.calendar_import_error_handle_twice({ handle: problem.handle });
    case 'channel_inactive':
      return calendarText.calendar_import_error_inactive({
        channel: problem.channel.displayName,
        status: statusLabel(problem.channel.status),
      });
    case 'channel_text_only':
      return calendarText.calendar_import_error_channel({ channel: problem.channel.displayName });
    case 'no_channels':
      return calendarText.calendar_import_error_channels();
    case 'date_invalid':
      return calendarText.calendar_import_error_date();
    case 'date_half':
      return calendarText.calendar_import_error_date_half();
  }
}

const ROW_ISSUES: Readonly<Record<string, () => string>> = {
  not_found: () => calendarText.calendar_import_issue_not_found(),
  out_of_scope: () => calendarText.calendar_import_issue_out_of_scope(),
  scope_missing: () => calendarText.calendar_import_issue_scope_missing(),
};

export function issueText(code: string): string {
  const own = Object.hasOwn(ROW_ISSUES, code) ? ROW_ISSUES[code] : undefined;
  return own === undefined ? issueMessage(code) : own();
}
