import { Button, ConfirmDelete, SettingsCard, SettingsPage, SettingsRow } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { meQuery } from '../../base/api/me.ts';
import { m } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { QUEUE_ROLES } from '../../records/channels/queue.ts';
import { type Shortener, shortenerQuery } from './queries.ts';
import { ShortenerForm } from './shortener-form.tsx';
import { useRemoveShortener } from './writes.ts';

interface ConnectedProps {
  readonly workspaceId: string;
  readonly shortener: Shortener;
  onEdit(): void;
}

function Connected({ workspaceId, shortener, onEdit }: ConnectedProps) {
  const [asking, setAsking] = useState(false);
  const close = () => setAsking(false);
  const remove = useRemoveShortener(workspaceId, close);
  const actions = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" size="sm" variant="outline" onClick={onEdit}>
        {settingsText.settings_short_links_edit()}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setAsking(true)}>
        {settingsText.settings_short_links_remove()}
      </Button>
    </div>
  );
  return (
    <SettingsCard title={settingsText.settings_short_links_connected_title()} footer={actions}>
      <SettingsRow label={settingsText.settings_short_links_provider()}>
        {settingsText.settings_short_links_provider_name({ provider: shortener.provider })}
      </SettingsRow>
      <SettingsRow label={settingsText.settings_short_links_base_url()}>
        <span className="break-all">{shortener.baseUrl}</span>
      </SettingsRow>
      <SettingsRow label={settingsText.settings_short_links_domain()}>
        {shortener.domain ?? settingsText.settings_short_links_domain_none()}
      </SettingsRow>
      <SettingsRow label={settingsText.settings_short_links_api_key()}>
        {shortener.hasKey
          ? settingsText.settings_short_links_api_key_set()
          : settingsText.settings_short_links_api_key_missing()}
      </SettingsRow>
      {asking ? (
        <ConfirmDelete
          title={settingsText.settings_short_links_remove_title()}
          body={settingsText.settings_short_links_remove_body()}
          keepLabel={settingsText.settings_short_links_keep()}
          confirmLabel={settingsText.settings_short_links_remove()}
          pending={remove.isPending}
          onCancel={close}
          onConfirm={() => remove.mutate()}
        />
      ) : null}
    </SettingsCard>
  );
}

function ShortenerSettings({ workspaceId }: { readonly workspaceId: string }) {
  const client = useApiClient();
  const shortener = useQuery(shortenerQuery(client, workspaceId));
  const [editing, setEditing] = useState(false);
  if (shortener.data === undefined) {
    return shortener.isError ? (
      <p role="alert" className="text-destructive text-sm">
        {m.error_generic()}
      </p>
    ) : (
      <p className="text-muted-foreground text-sm">{m.loading()}</p>
    );
  }
  if (shortener.data !== null && !editing) {
    return (
      <Connected
        workspaceId={workspaceId}
        shortener={shortener.data}
        onEdit={() => setEditing(true)}
      />
    );
  }
  return (
    <SettingsCard
      title={
        shortener.data === null
          ? settingsText.settings_short_links_connect_title()
          : settingsText.settings_short_links_edit_title()
      }
    >
      <ShortenerForm
        workspaceId={workspaceId}
        shortener={shortener.data}
        onDone={() => setEditing(false)}
      />
    </SettingsCard>
  );
}

export function ShortLinkSettingsPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <SettingsPage
      title={settingsText.settings_short_links_title()}
      intro={settingsText.settings_short_links_intro()}
    >
      <div tabIndex={-1} className="flex flex-col gap-6 outline-none">
        {workspace === undefined ? null : QUEUE_ROLES.has(workspace.role) ? (
          <ShortenerSettings workspaceId={workspace.id} />
        ) : (
          <p className="text-muted-foreground text-sm">{settingsText.settings_read_only()}</p>
        )}
      </div>
    </SettingsPage>
  );
}
