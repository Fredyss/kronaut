import { CheckList } from '../../base/ui/check-list.tsx';
import { type Channel, channelsKey } from '../../records/channels/queries.ts';
import { useGroupMember } from '../../records/groups/members.ts';
import type { Group } from '../../records/groups/queries.ts';

interface GroupsPanelProps {
  readonly workspaceId: string;
  readonly channel: Channel;
  readonly groups: readonly Group[];
  readonly label: string;
}

export function GroupsPanel({ workspaceId, channel, groups, label }: GroupsPanelProps) {
  const member = useGroupMember(workspaceId, [channelsKey(workspaceId)]);
  const checked = new Set(
    groups.filter((group) => group.channelIds.includes(channel.id)).map((group) => group.id),
  );
  return (
    <CheckList
      label={label}
      items={groups}
      checked={checked}
      onToggle={(groupId, on) => member.mutate({ groupId, channelId: channel.id, member: on })}
    />
  );
}
