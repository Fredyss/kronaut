import { Button, SettingsCard, SettingsPage } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { meQuery } from '../../base/api/me.ts';
import { useFormat } from '../../base/locale/format.ts';
import { m } from '../../base/locale/i18n.ts';
import { SecretDialog, type SecretText } from '../../base/ui/secret-dialog.tsx';
import { m as integrationsText } from '../../i18n/integrations.ts';
import { DeliveriesDialog } from './deliveries-dialog.tsx';
import { EndpointDialog } from './endpoint-dialog.tsx';
import { EndpointRow } from './endpoint-row.tsx';
import { type Endpoint, endpointHost, webhooksQuery } from './queries.ts';
import type { Revealed } from './writes.ts';

const MANAGERS: ReadonlySet<string> = new Set(['owner', 'admin']);

type Open =
  | { readonly kind: 'edit'; readonly endpoint: Endpoint | null }
  | { readonly kind: 'deliveries'; readonly endpoint: Endpoint }
  | { readonly kind: 'secret'; readonly revealed: Revealed }
  | null;

const secretText = (): SecretText => ({
  title: integrationsText.integrations_webhooks_secret_title(),
  once: integrationsText.integrations_webhooks_secret_once(),
  copy: integrationsText.integrations_webhooks_copy(),
  copied: integrationsText.integrations_webhooks_copied(),
  copyFailed: integrationsText.integrations_webhooks_copy_failed(),
  done: integrationsText.integrations_webhooks_done(),
});

function WebhookSecret({ revealed, onClose }: { readonly revealed: Revealed; onClose(): void }) {
  const when = useFormat(null);
  return (
    <SecretDialog secret={revealed.secret} text={secretText()} onClose={onClose}>
      <p>{integrationsText.integrations_webhooks_secret_use()}</p>
      {revealed.previousUntil === null ? null : (
        <p>
          {integrationsText.integrations_webhooks_secret_previous({
            time: when(revealed.previousUntil),
          })}
        </p>
      )}
    </SecretDialog>
  );
}

function OpenDialog({
  workspaceId,
  open,
  onOpen,
}: {
  readonly workspaceId: string;
  readonly open: Exclude<Open, null>;
  onOpen(open: Open): void;
}) {
  const close = () => onOpen(null);
  if (open.kind === 'secret') return <WebhookSecret revealed={open.revealed} onClose={close} />;
  if (open.kind === 'deliveries') {
    return (
      <DeliveriesDialog
        workspaceId={workspaceId}
        webhookId={open.endpoint.id}
        host={endpointHost(open.endpoint.url)}
        onClose={close}
      />
    );
  }
  return (
    <EndpointDialog
      workspaceId={workspaceId}
      endpoint={open.endpoint}
      onClose={(revealed) => onOpen(revealed === null ? null : { kind: 'secret', revealed })}
    />
  );
}

function EndpointList({ workspaceId }: { readonly workspaceId: string }) {
  const client = useApiClient();
  const endpoints = useQuery(webhooksQuery(client, workspaceId));
  const [open, setOpen] = useState<Open>(null);
  if (endpoints.data === undefined) {
    return endpoints.isError ? (
      <p role="alert" className="text-destructive text-sm">
        {m.error_generic()}
      </p>
    ) : (
      <p className="text-muted-foreground text-sm">{m.loading()}</p>
    );
  }
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => setOpen({ kind: 'edit', endpoint: null })}
      >
        {integrationsText.integrations_webhooks_add()}
      </Button>
      {endpoints.data.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {integrationsText.integrations_webhooks_empty()}
        </p>
      ) : (
        <SettingsCard title={integrationsText.integrations_webhooks_title()}>
          <ul className="flex flex-col divide-y">
            {endpoints.data.map((endpoint) => (
              <EndpointRow
                key={endpoint.id}
                workspaceId={workspaceId}
                endpoint={endpoint}
                onEdit={() => setOpen({ kind: 'edit', endpoint })}
                onDeliveries={() => setOpen({ kind: 'deliveries', endpoint })}
                onRevealed={(revealed) => setOpen({ kind: 'secret', revealed })}
              />
            ))}
          </ul>
        </SettingsCard>
      )}
      {open === null ? null : <OpenDialog workspaceId={workspaceId} open={open} onOpen={setOpen} />}
    </>
  );
}

export function WebhookSettingsPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <SettingsPage
      title={integrationsText.integrations_webhooks_title()}
      intro={integrationsText.integrations_webhooks_intro()}
    >
      {workspace === undefined ? null : (
        <div className="flex flex-col gap-6">
          {MANAGERS.has(workspace.role) ? (
            <EndpointList workspaceId={workspace.id} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {integrationsText.integrations_read_only()}
            </p>
          )}
        </div>
      )}
    </SettingsPage>
  );
}
