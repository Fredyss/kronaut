import { Button, Modal } from '@kronaut/ui';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { useFormat } from '../../base/locale/format.ts';
import { m } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { eventLabel, stateLabel } from './events.ts';
import { type Delivery, deliveriesQuery } from './queries.ts';

function outcome(delivery: Delivery): string | null {
  if (delivery.lastHttpStatus !== null) {
    return settingsText.settings_webhooks_http_status({ status: delivery.lastHttpStatus });
  }
  if (delivery.lastError !== null) {
    return settingsText.settings_webhooks_error_code({ code: delivery.lastError });
  }
  return null;
}

function DeliveryRow({ delivery }: { readonly delivery: Delivery }) {
  const when = useFormat(null);
  const failed = delivery.state === 'dead' || delivery.state === 'retry_wait';
  const result = outcome(delivery);
  return (
    <li className="flex flex-col gap-1 py-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{eventLabel(delivery.eventType)}</span>
        <span className={failed ? 'font-medium text-destructive' : 'text-muted-foreground'}>
          {stateLabel(delivery.state)}
        </span>
      </div>
      <span className="text-muted-foreground">
        {[
          when(delivery.createdAt),
          settingsText.settings_webhooks_attempts({ count: delivery.attemptCount }),
          result,
          delivery.nextAttemptAt === null
            ? null
            : settingsText.settings_webhooks_next_attempt({ time: when(delivery.nextAttemptAt) }),
        ]
          .filter((part) => part !== null)
          .join(' · ')}
      </span>
    </li>
  );
}

function DeliveryList({ workspaceId, webhookId }: { workspaceId: string; webhookId: string }) {
  const client = useApiClient();
  const deliveries = useInfiniteQuery(deliveriesQuery(client, workspaceId, webhookId));
  if (deliveries.data === undefined) {
    return deliveries.isError ? (
      <p role="alert" className="text-destructive text-sm">
        {m.error_generic()}
      </p>
    ) : (
      <p className="text-muted-foreground text-sm">{m.loading()}</p>
    );
  }
  const items = deliveries.data.pages.flatMap((page) => page.items);
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {settingsText.settings_webhooks_deliveries_empty()}
      </p>
    );
  }
  return (
    <>
      <ul className="flex flex-col divide-y overflow-y-auto">
        {items.map((delivery) => (
          <DeliveryRow key={delivery.id} delivery={delivery} />
        ))}
      </ul>
      {deliveries.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          className="self-center"
          disabled={deliveries.isFetchingNextPage}
          onClick={() => void deliveries.fetchNextPage()}
        >
          {settingsText.settings_webhooks_deliveries_more()}
        </Button>
      ) : null}
    </>
  );
}

interface DeliveriesDialogProps {
  readonly workspaceId: string;
  readonly webhookId: string;
  readonly host: string;
  onClose(): void;
}

export function DeliveriesDialog({ workspaceId, webhookId, host, onClose }: DeliveriesDialogProps) {
  const titleId = useId();
  return (
    <Modal labelledBy={titleId} wide onCancel={onClose}>
      <div className="flex max-h-[calc(100svh-4.5rem)] flex-col gap-4">
        <h2 id={titleId} className="font-medium text-lg">
          {settingsText.settings_webhooks_deliveries_named({ host })}
        </h2>
        <DeliveryList workspaceId={workspaceId} webhookId={webhookId} />
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            {settingsText.settings_webhooks_close()}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
