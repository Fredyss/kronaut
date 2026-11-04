import type { PostsImportResponse } from '@kronaut/sdk';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { browserTimeZone } from '../../base/locale/browser.ts';
import { choiceFor } from '../../composer/compose/content/choice.ts';
import { m as calendarText } from '../../i18n/calendar.ts';
import { type Channel, channelsQuery } from '../../records/channels/queries.ts';
import { type FileText, useFileText } from './file-text.ts';
import { RATE_LIMITED } from './media-fetch.ts';
import { fileMediaMessage } from './messages.ts';
import {
  draftImport,
  finishImport,
  mediaUrls,
  type Prepared,
  type Problem,
  serverProblems,
} from './prepare.ts';
import { type ImportRow, NO_MEDIA, type RowContext } from './rows.ts';
import { checkedRows, useImportCheck, useImportRun } from './use-import.ts';
import { useMediaFetch } from './use-media-fetch.ts';

interface Checked {
  readonly file: FileText;
  readonly prepared: Prepared | null;
  readonly channels: readonly Channel[];
  readonly errors: readonly unknown[];
  readonly limited: boolean;
}

function fileProblem(file: FileText): Problem | null {
  if (file.problem === 'read')
    return { line: null, message: calendarText.calendar_import_error_read() };
  if (file.problem === 'encoding') {
    return { line: null, message: calendarText.calendar_import_error_encoding() };
  }
  return null;
}

function shownProblems({ file, prepared, channels, errors, limited }: Checked): readonly Problem[] {
  const unread = fileProblem(file);
  if (unread !== null) return [unread];
  if (prepared === null) {
    return limited ? [{ line: null, message: fileMediaMessage(RATE_LIMITED) }] : [];
  }
  if (prepared.problems.length > 0) return prepared.problems;
  const error = errors.find((candidate) => candidate !== null);
  return error === undefined ? [] : serverProblems(error, prepared, channels);
}

export function queueWaiting(result: PostsImportResponse, rows: readonly ImportRow[] | undefined) {
  return result.rows.some(
    (row, index) => row.outcome === 'requested' && rows?.[index]?.schedule.mode === 'queue',
  );
}

function usePrepared(workspaceId: string, file: FileText, context: RowContext | null) {
  const drafted = useMemo(
    () => (file.text === null || context === null ? null : draftImport(file.text, context)),
    [file.text, context],
  );
  const urls = useMemo(() => mediaUrls(drafted), [drafted]);
  const media = useMediaFetch(workspaceId, urls, file.nonce);
  const prepared = useMemo(
    () =>
      drafted === null || context === null ? null : finishImport(drafted, media.results, context),
    [drafted, media.results, context],
  );
  return { prepared, media };
}

export function useImportState(workspaceId: string) {
  const client = useApiClient();
  const channels = useQuery(channelsQuery(client, workspaceId)).data;
  const usable = useMemo(
    () =>
      (channels ?? []).filter((c) => c.status === 'active' && choiceFor(c, NO_MEDIA).kind === 'ok'),
    [channels],
  );
  const [defaults, setDefaults] = useState<ReadonlySet<string>>(() => new Set());
  const [tz, setTz] = useState(browserTimeZone);
  const { file, pick } = useFileText();
  const context = useMemo(
    () => (channels === undefined ? null : { channels, defaults, tz }),
    [channels, defaults, tz],
  );
  const { prepared, media } = usePrepared(workspaceId, file, context);
  const check = useImportCheck(workspaceId, prepared, file.nonce);
  const run = useImportRun(workspaceId);
  const runError = run.variables === checkedRows(prepared) ? run.error : null;
  const errors = [runError, check.error];
  const checked = { file, prepared, channels: channels ?? [], errors, limited: media.limited };
  const problems = shownProblems(checked);
  const repick = (picked: File) => {
    run.reset();
    pick(picked);
  };
  const settings = { defaults, setDefaults, tz, setTz };
  return { usable, settings, file, pick: repick, prepared, media, check, run, problems };
}
