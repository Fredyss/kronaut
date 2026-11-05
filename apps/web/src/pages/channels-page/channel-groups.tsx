import { Button } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { lazyRouteComponent } from '@tanstack/react-router';
import { Suspense } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { meQuery } from '../../base/api/me.ts';
import { m } from '../../base/locale/i18n.ts';
import { useDisclosure } from '../../base/ui/disclosure.ts';
import type { Channel } from '../../records/channels/queries.ts';
import { type Group, groupsQuery } from '../../records/groups/queries.ts';

const ASSIGN_ROLES: ReadonlySet<string> = new Set(['owner', 'admin']);

interface LineProps {
  readonly workspaceId: string;
  readonly channel: Channel;
}

const GroupsPanel = lazyRouteComponent(() => import('./groups-panel.tsx'), 'GroupsPanel');

function preload(): void {
  void GroupsPanel.preload?.();
}

function GroupsMenu({ workspaceId, channel, groups }: LineProps & { groups: readonly Group[] }) {
  const { open, toggle, root, button, panelId } = useDisclosure();
  const label = m.channels_groups_edit_of({ name: channel.displayName });
  return (
    <div ref={root} className="relative">
      <Button
        ref={button}
        type="button"
        size="sm"
        variant="ghost"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        onMouseEnter={preload}
        onFocus={preload}
      >
        {m.channels_groups_edit()}
      </Button>
      {open ? (
        <div
          id={panelId}
          className="absolute left-0 z-40 mt-2 max-h-[50svh] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border bg-popover p-3 text-popover-foreground shadow-md"
        >
          <Suspense fallback={<p className="text-muted-foreground text-sm">{m.loading()}</p>}>
            <GroupsPanel
              workspaceId={workspaceId}
              channel={channel}
              groups={groups}
              label={label}
            />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}

function GroupLine({ workspaceId, channel, editable }: LineProps & { editable: boolean }) {
  const groups = useQuery(groupsQuery(useApiClient(), workspaceId)).data ?? [];
  if (groups.length === 0) return null;
  const names = new Map(groups.map((group) => [group.id, group.name]));
  const mine = channel.groupIds.flatMap((id) => {
    const name = names.get(id);
    return name === undefined ? [] : [{ id, name }];
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {mine.length === 0 ? null : (
        <ul
          aria-label={m.channels_groups_of({ name: channel.displayName })}
          className="flex flex-wrap gap-1"
        >
          {mine.map((group) => (
            <li key={group.id} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
              {group.name}
            </li>
          ))}
        </ul>
      )}
      {editable ? <GroupsMenu workspaceId={workspaceId} channel={channel} groups={groups} /> : null}
    </div>
  );
}

export function ChannelGroups({ channel }: { readonly channel: Channel }) {
  const workspace = useQuery(meQuery(useApiClient())).data?.workspaces[0];
  if (workspace === undefined) return null;
  const editable = ASSIGN_ROLES.has(workspace.role);
  return <GroupLine workspaceId={workspace.id} channel={channel} editable={editable} />;
}
