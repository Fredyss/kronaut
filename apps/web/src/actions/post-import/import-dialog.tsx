import { Button, Modal } from '@kronaut/ui';
import { useId } from 'react';
import { m } from '../../base/locale/i18n.ts';
import { m as calendarText } from '../../i18n/calendar.ts';
import { ImportFields } from './import-fields.tsx';
import { queueWaiting, useImportState } from './import-state.ts';
import { Done, FetchStatus, Problems } from './import-status.tsx';
import { checkedRows } from './use-import.ts';

export interface ImportDialogProps {
  readonly workspaceId: string;
  onClose(): void;
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
        {run.data === undefined ? <FetchStatus media={state.media} /> : null}
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
