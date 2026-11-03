import { Button } from '@kronaut/ui';
import { lazy, Suspense, useState } from 'react';
import { m as calendarText } from '../../i18n/calendar.ts';
import { canImport } from '../../records/posts/permissions.ts';

const ImportDialog = lazy(() =>
  import('./import-dialog.tsx').then((module) => ({ default: module.ImportDialog })),
);

export interface ImportButtonProps {
  readonly workspaceId: string;
  readonly role: string;
}

export function ImportButton({ workspaceId, role }: ImportButtonProps) {
  const [open, setOpen] = useState(false);
  if (!canImport(role)) return null;
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {calendarText.calendar_import_open()}
      </Button>
      {open ? (
        <Suspense fallback={null}>
          <ImportDialog workspaceId={workspaceId} onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
