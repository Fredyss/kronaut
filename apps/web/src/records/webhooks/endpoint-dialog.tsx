import { Button, Modal, TextField } from '@kronaut/ui';
import { type FormEvent, useId, useState } from 'react';
import { m } from '../../base/locale/i18n.ts';
import { CheckList } from '../../base/ui/check-list.tsx';
import { m as settingsText } from '../../i18n/settings.ts';
import { endpointErrors } from './errors.ts';
import { eventLabel, isWebhookEvent, WEBHOOK_EVENTS } from './events.ts';
import { ENDPOINT_URL_MAX, type Endpoint, type WebhookEvent } from './queries.ts';
import { type Revealed, useSaveEndpoint } from './writes.ts';

const EVENT_ITEMS = () => WEBHOOK_EVENTS.map((id) => ({ id, name: eventLabel(id), hint: id }));

interface EndpointDialogProps {
  readonly workspaceId: string;
  readonly endpoint: Endpoint | null;
  onClose(revealed: Revealed | null): void;
}

export function EndpointDialog({ workspaceId, endpoint, onClose }: EndpointDialogProps) {
  const titleId = useId();
  const [url, setUrl] = useState(endpoint?.url ?? '');
  const [events, setEvents] = useState<ReadonlySet<WebhookEvent>>(
    () => new Set(endpoint?.events.filter(isWebhookEvent)),
  );
  const save = useSaveEndpoint(workspaceId, endpoint?.id ?? null, onClose);
  const errors = save.error === null ? {} : endpointErrors(save.error);
  const ready = url.trim() !== '' && events.size > 0;
  const close = () => {
    if (!save.isPending) onClose(null);
  };
  const toggle = (id: string, on: boolean) => {
    if (!isWebhookEvent(id)) return;
    setEvents((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready || save.isPending) return;
    save.mutate({ url, events: WEBHOOK_EVENTS.filter((type) => events.has(type)) });
  };
  return (
    <Modal labelledBy={titleId} wide onCancel={close}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <h2 id={titleId} className="font-medium text-lg">
          {endpoint === null
            ? settingsText.settings_webhooks_add()
            : settingsText.settings_webhooks_edit_title()}
        </h2>
        <fieldset disabled={save.isPending} className="contents">
          <TextField
            label={settingsText.settings_webhooks_url()}
            hint={settingsText.settings_webhooks_url_hint()}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            maxLength={ENDPOINT_URL_MAX}
            error={errors.url}
            onValueChange={setUrl}
          />
          <div className="flex flex-col gap-2">
            <span className="font-medium text-sm">{settingsText.settings_webhooks_events()}</span>
            <CheckList
              label={settingsText.settings_webhooks_events()}
              items={EVENT_ITEMS()}
              checked={events}
              onToggle={toggle}
            />
          </div>
        </fieldset>
        {errors.form === undefined ? null : (
          <p role="alert" className="text-destructive text-sm">
            {errors.form}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            {settingsText.settings_webhooks_cancel()}
          </Button>
          <Button type="submit" disabled={!ready || save.isPending}>
            {m.settings_save()}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
