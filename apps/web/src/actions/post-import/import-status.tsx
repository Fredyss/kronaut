import type { PostsImportResponse } from '@kronaut/sdk';
import { Button } from '@kronaut/ui';
import { m as calendarText } from '../../i18n/calendar.ts';
import type { Problem } from './prepare.ts';
import type { MediaFetch } from './use-media-fetch.ts';

function lineText(problem: Problem): string {
  if (problem.line === null) return problem.message;
  return calendarText.calendar_import_line({ line: problem.line, problem: problem.message });
}

export function Problems({ problems }: { readonly problems: readonly Problem[] }) {
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

interface DoneProps {
  readonly result: PostsImportResponse;
  readonly queueWaiting: boolean;
}

export function Done({ result, queueWaiting }: DoneProps) {
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
      {queueWaiting ? (
        <p className="text-muted-foreground">{calendarText.calendar_import_requested_queue()}</p>
      ) : null}
    </div>
  );
}

export function FetchStatus({ media }: { readonly media: MediaFetch }) {
  if (media.cancelled) {
    return (
      <p role="status" className="text-muted-foreground text-sm">
        {calendarText.calendar_import_fetch_stopped()}
      </p>
    );
  }
  if (media.progress === null) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p role="status" className="text-muted-foreground">
        {calendarText.calendar_import_fetching(media.progress)}
      </p>
      <Button type="button" variant="ghost" onClick={media.cancel}>
        {calendarText.calendar_import_fetch_stop()}
      </Button>
    </div>
  );
}
