import { Button, ConfirmDelete, focusNeighbour } from '@kronaut/ui';
import { useRef, useState } from 'react';
import { NameField } from '../../base/ui/name-field.tsx';
import { m as settingsText } from '../../i18n/settings.ts';
import { channelsKey } from '../../records/channels/queries.ts';
import { GROUP_NAME_MAX, type Group } from '../../records/groups/queries.ts';
import { useGroupWrites } from '../../records/groups/writes.ts';
import { postsKey } from '../../records/posts/queries.ts';
import { MembersDialog } from './members-dialog.tsx';

interface RowProps {
  readonly workspaceId: string;
  readonly group: Group;
}

function ChannelCount({ group }: { readonly group: Group }) {
  return (
    <span className="text-muted-foreground text-sm tabular-nums">
      {settingsText.settings_group_channels({ count: group.channelIds.length })}
    </span>
  );
}

export function EditableRow({ workspaceId, group }: RowProps) {
  const row = useRef<HTMLLIElement>(null);
  const [panel, setPanel] = useState<'members' | 'delete' | null>(null);
  const { rename, remove } = useGroupWrites(workspaceId, group.id, {
    deleteTouches: [channelsKey(workspaceId), postsKey(workspaceId)],
    onDeleted: () => focusNeighbour(row.current),
  });
  const { name } = group;
  return (
    <li ref={row} className="flex flex-wrap items-center gap-3 px-6 py-3">
      <NameField
        name={name}
        label={settingsText.settings_group_name({ name })}
        maxLength={GROUP_NAME_MAX}
        onRename={(next, onRefused) => rename.mutate(next, { onError: onRefused })}
      />
      <ChannelCount group={group} />
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={settingsText.settings_group_members_of({ name })}
        onClick={() => setPanel('members')}
      >
        {settingsText.settings_group_members()}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={settingsText.settings_group_delete({ name })}
        onClick={() => setPanel('delete')}
      >
        {settingsText.settings_group_delete_confirm()}
      </Button>
      {panel === 'delete' ? (
        <ConfirmDelete
          title={settingsText.settings_group_delete_title({ name })}
          body={settingsText.settings_group_delete_body()}
          keepLabel={settingsText.settings_group_keep()}
          confirmLabel={settingsText.settings_group_delete_confirm()}
          pending={remove.isPending}
          onCancel={() => setPanel(null)}
          onConfirm={() => remove.mutate(undefined, { onSettled: () => setPanel(null) })}
        />
      ) : null}
      {panel === 'members' ? (
        <MembersDialog workspaceId={workspaceId} group={group} onClose={() => setPanel(null)} />
      ) : null}
    </li>
  );
}

export function ReadOnlyRow({ group }: { readonly group: Group }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-6 py-3 text-sm">
      <span className="min-w-0 flex-1 truncate">{group.name}</span>
      <ChannelCount group={group} />
    </li>
  );
}
