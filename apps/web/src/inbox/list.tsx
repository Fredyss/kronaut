import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { needsActionQuery } from '../api.ts';
import { useFormats } from '../calendar/formats.ts';
import { browserTimeZone } from '../calendar/time.ts';
import { useApiClient, useLocale } from '../context.ts';
import { m as inboxText } from '../i18n/inbox.ts';
import { m } from '../i18n.ts';
import { InboxRow } from './row.tsx';

function Empty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center">
      <h2 className="font-medium text-lg">{inboxText.inbox_empty_title()}</h2>
      <p className="text-muted-foreground text-sm">{inboxText.inbox_empty_body()}</p>
    </div>
  );
}

export function InboxList({ workspaceId }: { readonly workspaceId: string }) {
  const client = useApiClient();
  const { locale } = useLocale();
  const [timeZone] = useState(browserTimeZone);
  const formats = useFormats(locale, timeZone);
  const list = useQuery(needsActionQuery(client, workspaceId));
  if (list.data === undefined) {
    return list.isError ? (
      <p role="alert" className="text-destructive text-sm">
        {m.inbox_load_failed()}
      </p>
    ) : (
      <p className="text-muted-foreground text-sm">{m.loading()}</p>
    );
  }
  const { items, total, truncated } = list.data;
  if (items.length === 0) return <Empty />;
  return (
    <>
      {truncated ? (
        <p className="rounded-md border px-3 py-2 text-sm">
          {inboxText.inbox_truncated({ shown: items.length, total })}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <InboxRow
            key={item.destinationId}
            workspaceId={workspaceId}
            item={item}
            formats={formats}
          />
        ))}
      </ul>
    </>
  );
}
