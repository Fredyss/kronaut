import { Button, Modal, toast } from '@kronaut/ui';
import { useId } from 'react';
import { useFormat } from '../../base/locale/format.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import type { Revealed } from './writes.ts';

async function copy(secret: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(secret);
    toast(settingsText.settings_webhooks_copied());
  } catch {
    toast(settingsText.settings_webhooks_copy_failed(), 'destructive');
  }
}

export function SecretDialog({
  revealed,
  onClose,
}: {
  readonly revealed: Revealed;
  onClose(): void;
}) {
  const titleId = useId();
  const noteId = useId();
  const when = useFormat(null);
  return (
    <Modal labelledBy={titleId} describedBy={noteId} onCancel={onClose}>
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="font-medium text-lg">
          {settingsText.settings_webhooks_secret_title()}
        </h2>
        <p id={noteId} className="font-medium text-sm">
          {settingsText.settings_webhooks_secret_once()}
        </p>
        <output
          aria-labelledby={titleId}
          className="block select-all break-all rounded-md border bg-muted px-3 py-2 font-mono text-sm"
        >
          {revealed.secret}
        </output>
        <div className="flex flex-col gap-1 text-muted-foreground text-sm">
          <p>{settingsText.settings_webhooks_secret_use()}</p>
          {revealed.previousUntil === null ? null : (
            <p>
              {settingsText.settings_webhooks_secret_previous({
                time: when(revealed.previousUntil),
              })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => void copy(revealed.secret)}>
            {settingsText.settings_webhooks_copy()}
          </Button>
          <Button type="button" onClick={onClose}>
            {settingsText.settings_webhooks_done()}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
