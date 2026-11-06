import { Button, Modal } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { providerUi } from '../../base/providers/ui.ts';
import { CheckList } from '../../base/ui/check-list.tsx';
import { m as settingsText } from '../../i18n/settings.ts';
import { channelsKey, channelsQuery } from '../../records/channels/queries.ts';
import { useGroupMember } from '../../records/groups/members.ts';
import type { Group } from '../../records/groups/queries.ts';
import { LoadState } from './load-state.tsx';

interface MembersDialogProps {
  readonly workspaceId: string;
  readonly group: Group;
  onClose(): void;
}

function Channels({ workspaceId, group }: Omit<MembersDialogProps, 'onClose'>) {
  const client = useApiClient();
  const channels = useQuery(channelsQuery(client, workspaceId));
  const member = useGroupMember(workspaceId, [channelsKey(workspaceId)]);
  if (channels.data === undefined) return <LoadState failed={channels.isError} />;
  if (channels.data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{settingsText.settings_group_no_channels()}</p>
    );
  }
  return (
    <CheckList
      label={settingsText.settings_group_members_of({ name: group.name })}
      items={channels.data.map((channel) => ({
        id: channel.id,
        name: channel.displayName,
        hint: providerUi(channel.provider).name(),
      }))}
      checked={new Set(group.channelIds)}
      onToggle={(channelId, on) => member.mutate({ groupId: group.id, channelId, member: on })}
    />
  );
}

export function MembersDialog({ workspaceId, group, onClose }: MembersDialogProps) {
  const titleId = useId();
  return (
    <Modal labelledBy={titleId} onCancel={onClose}>
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="font-medium text-lg">
          {settingsText.settings_group_members_of({ name: group.name })}
        </h2>
        <Channels workspaceId={workspaceId} group={group} />
        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            {settingsText.settings_group_done()}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
