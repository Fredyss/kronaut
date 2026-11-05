import { m as composeText } from '../../../i18n/compose.ts';
import type { Group } from '../../../records/groups/queries.ts';

interface GroupChipsProps {
  readonly groups: readonly Group[] | undefined;
  readonly usable: ReadonlySet<string>;
  readonly selected: ReadonlySet<string>;
  readonly disabled: boolean;
  onPick(groupId: string, ids: readonly string[]): void;
}

export function GroupChips({ groups, usable, selected, disabled, onPick }: GroupChipsProps) {
  if (groups === undefined || groups.length === 0) return null;
  return (
    <fieldset>
      <legend className="mb-2 text-muted-foreground text-xs">{composeText.compose_groups()}</legend>
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => {
          const ids = group.channelIds.filter((id) => usable.has(id) && !selected.has(id));
          return (
            <button
              key={group.id}
              type="button"
              className="rounded-full border px-3 py-1 text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 disabled:hover:bg-transparent"
              disabled={disabled || ids.length === 0}
              aria-label={composeText.compose_group_add_of({ name: group.name })}
              onClick={() => onPick(group.id, ids)}
            >
              {group.name}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
