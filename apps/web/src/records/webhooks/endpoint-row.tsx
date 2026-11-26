import { Button, ConfirmDelete, ConfirmDialog, focusNeighbour, Switch } from '@kronaut/ui';
import { useRef, useState } from 'react';
import { useLocale } from '../../base/locale/context.ts';
import { useFormat } from '../../base/locale/format.ts';
import { m as integrationsText } from '../../i18n/integrations.ts';
import { eventLabel } from './events.ts';
import { type Endpoint, endpointHost } from './queries.ts';
import { type Revealed, useEndpointWrites } from './writes.ts';

const PREVIOUS_SECRET_HOURS = 24;

type Asking = 'rotate' | 'delete' | null;

function Details({ endpoint, host }: { readonly endpoint: Endpoint; readonly host: string }) {
  const { locale } = useLocale();
  const when = useFormat(null);
  const events = new Intl.ListFormat(locale).format(endpoint.events.map(eventLabel));
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
      <span className="truncate font-medium" title={endpoint.url}>
        {host}
      </span>
      <span className="text-muted-foreground">{events}</span>
      {endpoint.disabledReason === 'failing' ? (
        <p role="status" className="border-destructive border-l-4 bg-destructive/10 px-3 py-2">
          {integrationsText.integrations_webhooks_failing()}
        </p>
      ) : null}
      {endpoint.enabled && endpoint.failingSince !== null ? (
        <span className="text-destructive">
          {integrationsText.integrations_webhooks_failing_since({
            time: when(endpoint.failingSince),
          })}
        </span>
      ) : null}
    </div>
  );
}

function Confirm({
  asking,
  writes,
  onClose,
}: {
  readonly asking: Exclude<Asking, null>;
  readonly writes: ReturnType<typeof useEndpointWrites>;
  onClose(): void;
}) {
  const done = { onSettled: onClose };
  return asking === 'rotate' ? (
    <ConfirmDialog
      tone="destructive"
      title={integrationsText.integrations_webhooks_rotate_title()}
      body={integrationsText.integrations_webhooks_rotate_body({ count: PREVIOUS_SECRET_HOURS })}
      keepLabel={integrationsText.integrations_webhooks_keep_secret()}
      confirmLabel={integrationsText.integrations_webhooks_rotate_confirm()}
      pending={writes.rotate.isPending}
      onCancel={onClose}
      onConfirm={() => writes.rotate.mutate(undefined, done)}
    />
  ) : (
    <ConfirmDelete
      title={integrationsText.integrations_webhooks_delete_title()}
      body={integrationsText.integrations_webhooks_delete_body()}
      keepLabel={integrationsText.integrations_webhooks_keep_endpoint()}
      confirmLabel={integrationsText.integrations_webhooks_delete()}
      pending={writes.remove.isPending}
      onCancel={onClose}
      onConfirm={() => writes.remove.mutate(undefined, done)}
    />
  );
}

interface EndpointRowProps {
  readonly workspaceId: string;
  readonly endpoint: Endpoint;
  onEdit(): void;
  onDeliveries(): void;
  onRevealed(revealed: Revealed): void;
}

export function EndpointRow({
  workspaceId,
  endpoint,
  onEdit,
  onDeliveries,
  onRevealed,
}: EndpointRowProps) {
  const row = useRef<HTMLLIElement>(null);
  const writes = useEndpointWrites(workspaceId, endpoint.id, {
    onDeleted: () => focusNeighbour(row.current),
    onRevealed,
  });
  const [asking, setAsking] = useState<Asking>(null);
  const host = endpointHost(endpoint.url);
  const action = (label: string, named: string, onClick: () => void, disabled = false) => (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-label={named}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
  return (
    <li ref={row} className="flex flex-wrap items-center gap-3 px-6 py-3">
      <Details endpoint={endpoint} host={host} />
      <span className="flex items-center gap-2 text-sm">
        <Switch
          checked={endpoint.enabled}
          aria-label={integrationsText.integrations_webhooks_enabled_named({ host })}
          disabled={writes.toggle.isPending}
          onCheckedChange={(enabled) => writes.toggle.mutate(enabled)}
        />
        {endpoint.enabled
          ? integrationsText.integrations_webhooks_on()
          : integrationsText.integrations_webhooks_off()}
      </span>
      <div className="flex flex-wrap gap-2">
        {action(
          integrationsText.integrations_webhooks_edit(),
          integrationsText.integrations_webhooks_edit_named({ host }),
          onEdit,
        )}
        {action(
          integrationsText.integrations_webhooks_test(),
          integrationsText.integrations_webhooks_test_named({ host }),
          () => writes.test.mutate(),
          writes.test.isPending || !endpoint.enabled,
        )}
        {action(
          integrationsText.integrations_webhooks_deliveries(),
          integrationsText.integrations_webhooks_deliveries_named({ host }),
          onDeliveries,
        )}
        {action(
          integrationsText.integrations_webhooks_rotate(),
          integrationsText.integrations_webhooks_rotate_named({ host }),
          () => setAsking('rotate'),
        )}
        {action(
          integrationsText.integrations_webhooks_delete(),
          integrationsText.integrations_webhooks_delete_named({ host }),
          () => setAsking('delete'),
        )}
      </div>
      {asking === null ? null : (
        <Confirm asking={asking} writes={writes} onClose={() => setAsking(null)} />
      )}
    </li>
  );
}
