import type { PostsImportResponse } from '@kronaut/sdk';
import { Button, Modal } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useId, useMemo, useRef, useState } from 'react';
import { useApiClient } from '../api/client.ts';
import { channelsQuery } from '../channels/queries.ts';
import { choiceFor } from '../compose/content/choice.ts';
import { m as calendarText } from '../i18n/calendar.ts';
import { browserTimeZone } from '../locale/browser.ts';
import { m } from '../locale/i18n.ts';
import { ImportFields } from './import-fields.tsx';
import { type Prepared, type Problem, prepareImport, serverProblems } from './prepare.ts';
import { checkedRows, useImportCheck, useImportRun } from './use-import.ts';

const NO_MEDIA = { images: [], video: false } as const;

export interface ImportDialogProps {
  readonly workspaceId: string;
  onClose(): void;
}

interface FileText {
  readonly name: string | null;
  readonly text: string | null;
  readonly failed: boolean;
}

const NO_FILE: FileText = { name: null, text: null, failed: false };

function useFileText() {
  const [file, setFile] = useState<FileText>(NO_FILE);
  const latest = useRef<File | null>(null);
  const pick = (picked: File) => {
    latest.current = picked;
    const settle = (text: string | null) => {
      if (latest.current === picked) setFile({ name: picked.name, text, failed: text === null });
    };
    picked.text().then(settle, () => settle(null));
  };
  return { file, pick };
}

function lineText(problem: Problem): string {
  if (problem.line === null) return problem.message;
  return calendarText.calendar_import_line({ line: problem.line, problem: problem.message });
}

function Problems({ problems }: { readonly problems: readonly Problem[] }) {
  const shown = [...new Set(problems.map(lineText))];
  return (
    <div role="alert" className="flex flex-col gap-1 text-destructive text-sm">
      <p className="font-medium">
        {calendarText.calendar_import_problems({ count: shown.length })}
      </p>
      <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
        {shown.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </div>
  );
}

function Done({ result }: { readonly result: PostsImportResponse }) {
  const count = (outcome: string) => result.rows.filter((row) => row.outcome === outcome).length;
  const scheduled = count('scheduled');
  const requested = count('requested');
  return (
    <div role="status" className="flex flex-col gap-1 text-sm">
      {scheduled === 0 ? null : (
        <p>{calendarText.calendar_import_scheduled({ count: scheduled })}</p>
      )}
      {requested === 0 ? null : (
        <p>{calendarText.calendar_import_requested({ count: requested })}</p>
      )}
    </div>
  );
}

interface Checked {
  readonly file: FileText;
  readonly prepared: Prepared | null;
  readonly checkError: unknown;
  readonly runError: unknown;
}

function shownProblems({ file, prepared, checkError, runError }: Checked): readonly Problem[] {
  if (file.failed) return [{ line: null, message: calendarText.calendar_import_error_read() }];
  if (prepared === null) return [];
  if (prepared.problems.length > 0) return prepared.problems;
  if (runError !== null) return serverProblems(runError, prepared.lines);
  if (checkError !== null) return serverProblems(checkError, prepared.lines);
  return [];
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
  const check = useImportCheck(workspaceId, prepared);
  const run = useImportRun(workspaceId);
  const runError = run.variables === checkedRows(prepared) ? run.error : null;
  const problems = shownProblems({ file, prepared, checkError: check.error, runError });
  return {
    usable,
    settings: { defaults, setDefaults, tz, setTz },
    file,
    pick,
    prepared,
    check,
    run,
    problems,
  };
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
          <Done result={run.data} />
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
