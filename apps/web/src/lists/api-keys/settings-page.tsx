import { Button, SecretDialog, SettingsCard, SettingsPage } from '@kronaut/ui';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { isManager, meQuery } from '../../base/api/me.ts';
import { LoadState } from '../../base/ui/load-state.tsx';
import { m as integrationsText } from '../../i18n/integrations.ts';
import { CreateDialog } from './create-dialog.tsx';
import { KeyRow } from './key-row.tsx';
import { apiKeysQuery } from './queries.ts';

const BEARER = 'Authorization: Bearer <token>';

type Open = { readonly kind: 'create' } | { readonly kind: 'token'; readonly token: string } | null;

const tokenLabels = () => ({
  copy: integrationsText.integrations_api_keys_copy(),
  copied: integrationsText.integrations_api_keys_copied(),
  copyFailed: integrationsText.integrations_api_keys_copy_failed(),
  done: integrationsText.integrations_secret_done(),
});

function OpenDialog({
  workspaceId,
  open,
  onOpen,
}: {
  readonly workspaceId: string;
  readonly open: Exclude<Open, null>;
  onOpen(open: Open): void;
}) {
  if (open.kind === 'create') {
    return (
      <CreateDialog
        workspaceId={workspaceId}
        onClose={(token) => onOpen(token === null ? null : { kind: 'token', token })}
      />
    );
  }
  return (
    <SecretDialog
      secret={open.token}
      title={integrationsText.integrations_api_keys_token_title()}
      once={integrationsText.integrations_api_keys_token_once()}
      labels={tokenLabels()}
      onClose={() => onOpen(null)}
    >
      <p>{integrationsText.integrations_api_keys_token_use()}</p>
      <code className="font-mono">{BEARER}</code>
    </SecretDialog>
  );
}

function KeyList({ workspaceId }: { readonly workspaceId: string }) {
  const client = useApiClient();
  const keys = useInfiniteQuery(apiKeysQuery(client, workspaceId));
  if (keys.data === undefined) return <LoadState failed={keys.isError} />;
  const items = keys.data.pages.flatMap((page) => page.items);
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {integrationsText.integrations_api_keys_empty()}
      </p>
    );
  }
  return (
    <SettingsCard title={integrationsText.integrations_api_keys_title()}>
      <ul className="flex flex-col divide-y">
        {items.map((apiKey) => (
          <KeyRow key={apiKey.id} workspaceId={workspaceId} apiKey={apiKey} />
        ))}
      </ul>
      {keys.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          className="m-4 self-center"
          disabled={keys.isFetchingNextPage}
          onClick={() => void keys.fetchNextPage()}
        >
          {integrationsText.integrations_api_keys_more()}
        </Button>
      ) : null}
    </SettingsCard>
  );
}

function ApiKeys({ workspaceId }: { readonly workspaceId: string }) {
  const [open, setOpen] = useState<Open>(null);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => setOpen({ kind: 'create' })}
      >
        {integrationsText.integrations_api_keys_add()}
      </Button>
      <KeyList workspaceId={workspaceId} />
      {open === null ? null : <OpenDialog workspaceId={workspaceId} open={open} onOpen={setOpen} />}
    </>
  );
}

export function ApiKeySettingsPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <SettingsPage
      title={integrationsText.integrations_api_keys_title()}
      intro={integrationsText.integrations_api_keys_intro()}
    >
      {workspace === undefined ? null : (
        <div className="flex flex-col gap-6">
          {isManager(workspace.role) ? (
            <ApiKeys workspaceId={workspace.id} />
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
