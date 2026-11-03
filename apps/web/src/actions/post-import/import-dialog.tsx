import type { PostsImportResponse } from '@kronaut/sdk';
import { Button, Modal } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useId, useMemo, useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { browserTimeZone } from '../../base/locale/browser.ts';
import { m } from '../../base/locale/i18n.ts';
import { choiceFor } from '../../composer/compose/content/choice.ts';
import { m as calendarText } from '../../i18n/calendar.ts';
import { type Channel, channelsQuery } from '../../records/channels/queries.ts';
import { type FileText, useFileText } from './file-text.ts';
import { ImportFields } from './import-fields.tsx';
import { Done, Problems } from './import-status.tsx';
import { type Prepared, type Problem, prepareImport, serverProblems } from './prepare.ts';
import type { ImportRow } from './rows.ts';
import { checkedRows, useImportCheck, useImportRun } from './use-import.ts';

const NO_MEDIA = { images: [], video: false } as const;

export interface ImportDialogProps {
  readonly workspaceId: string;
  onClose(): void;
}

interface Checked {
  readonly file: FileText;
  readonly prepared: Prepared | null;
  readonly channels: readonly Channel[];
  readonly errors: readonly unknown[];
}

function fileProblem(file: FileText): Problem | null {
  if (file.problem === 'read')
    return { line: null, message: calendarText.calendar_import_error_read() };
  if (file.problem === 'encoding') {
    return { line: null, message: calendarText.calendar_import_error_encoding() };
  }
  return null;
}

function shownProblems({ file, prepared, channels, errors }: Checked): readonly Problem[] {
  const unread = fileProblem(file);
  if (unread !== null) return [unread];
  if (prepared === null) return [];
  if (prepared.problems.length > 0) return prepared.problems;
  const error = errors.find((candidate) => candidate !== null);
  return error === undefined ? [] : serverProblems(error, prepared, channels);
}

function queueWaiting(result: PostsImportResponse, rows: readonly ImportRow[] | undefined) {
  return result.rows.some(
    (row, index) => row.outcome === 'requested' && rows?.[index]?.schedule.mode === 'queue',
  );
}

function useImportState(workspaceId: string) {
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
  const prepared = useMemo(
    () =>
      file.text === null || channels === undefined
        ? null
        : prepareImport(file.text, { channels, defaults, tz }),
    [file.text, channels, defaults, tz],
  );
  const check = useImportCheck(workspaceId, prepared, file.nonce);
  const run = useImportRun(workspaceId);
  const runError = run.variables === checkedRows(prepared) ? run.error : null;
  const errors = [runError, check.error];
  const problems = shownProblems({ file, prepared, channels: channels ?? [], errors });
  const repick = (picked: File) => {
    run.reset();
    pick(picked);
  };
  const settings = { defaults, setDefaults, tz, setTz };
  return { usable, settings, file, pick: repick, prepared, check, run, problems };
}

export function ImportDialog({ workspaceId, onClose }: ImportDialogProps) {
  const titleId = useId();
  const state = useImportState(workspaceId);
  const { prepared, check, run, problems } = state;
  const rows = checkedRows(prepared);
  const ready = rows !== null && check.isSuccess && problems.length === 0;
  const close = () => {
    if (!run.isPending) onClose();
  };
  return (
    <Modal labelledBy={titleId} wide onCancel={close}>
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="font-medium text-lg">
          {calendarText.calendar_import_title()}
        </h2>
        {run.data === undefined ? (
          <fieldset disabled={run.isPending} className="contents">
            <ImportFields
              channels={state.usable}
              settings={state.settings}
              fileName={state.file.name}
              pick={state.pick}
            />
          </fieldset>
        ) : (
          <Done result={run.data} queueWaiting={queueWaiting(run.data, run.variables)} />
        )}
        {problems.length > 0 ? <Problems problems={problems} /> : null}
        {check.isFetching ? (
          <p className="text-muted-foreground text-sm">{calendarText.calendar_import_checking()}</p>
        ) : null}
        {ready && run.data === undefined ? (
          <p role="status" className="text-sm">
            {calendarText.calendar_import_ready({ count: rows.length })}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {m.close()}
          </Button>
          {run.data === undefined ? (
            <Button
              type="button"
              disabled={!ready || run.isPending}
              onClick={() => rows !== null && run.mutate(rows)}
            >
              {run.isPending
                ? calendarText.calendar_import_importing()
                : calendarText.calendar_import_submit()}
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
