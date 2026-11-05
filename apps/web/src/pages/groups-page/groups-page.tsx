import { Button, SettingsCard, SettingsPage } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { meQuery } from '../../base/api/me.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { groupsQuery } from '../../records/groups/queries.ts';
import { CreateGroupDialog } from './create-dialog.tsx';
import { EditableRow, ReadOnlyRow } from './group-row.tsx';
import { LoadState } from './load-state.tsx';

const EDITORS: ReadonlySet<string> = new Set(['owner', 'admin']);

interface ListProps {
  readonly workspaceId: string;
  readonly editable: boolean;
}

function GroupList({ workspaceId, editable }: ListProps) {
  const groups = useQuery(groupsQuery(useApiClient(), workspaceId));
  if (groups.data === undefined) return <LoadState failed={groups.isError} />;
  if (groups.data.length === 0) {
    return <p className="text-muted-foreground text-sm">{settingsText.settings_groups_empty()}</p>;
  }
  const rows = groups.data.map((group) =>
    editable ? (
      <EditableRow key={group.id} workspaceId={workspaceId} group={group} />
    ) : (
      <ReadOnlyRow key={group.id} group={group} />
    ),
  );
  return (
    <SettingsCard title={settingsText.settings_groups_title()}>
      <ul className="flex flex-col divide-y">{rows}</ul>
    </SettingsCard>
  );
}

function Toolbar({ workspaceId, editable }: ListProps) {
  const [creating, setCreating] = useState(false);
  if (!editable) {
    return <p className="text-muted-foreground text-sm">{settingsText.settings_read_only()}</p>;
  }
  return (
    <div>
      <Button type="button" onClick={() => setCreating(true)}>
        {settingsText.settings_group_new()}
      </Button>
      {creating ? (
        <CreateGroupDialog workspaceId={workspaceId} onClose={() => setCreating(false)} />
      ) : null}
    </div>
  );
}

export function GroupSettingsPage() {
  const workspace = useQuery(meQuery(useApiClient())).data?.workspaces[0];
  const editable = workspace !== undefined && EDITORS.has(workspace.role);
  return (
    <SettingsPage
      title={settingsText.settings_groups_title()}
      intro={settingsText.settings_groups_intro()}
    >
      {workspace === undefined ? null : (
        <div className="flex flex-col gap-6">
          <Toolbar workspaceId={workspace.id} editable={editable} />
          <GroupList workspaceId={workspace.id} editable={editable} />
        </div>
      )}
    </SettingsPage>
  );
}
