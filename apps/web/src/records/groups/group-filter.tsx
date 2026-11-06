import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { m } from '../../base/locale/i18n.ts';
import { FilterSelect } from '../../base/ui/filter-select.tsx';
import { groupsQuery } from './queries.ts';

interface GroupFilterProps {
  readonly workspaceId: string;
  readonly group: string | undefined;
  onChange(group: string | undefined): void;
}

export function GroupFilter({ workspaceId, group, onChange }: GroupFilterProps) {
  const groups = useQuery(groupsQuery(useApiClient(), workspaceId)).data;
  if (groups === undefined || groups.length === 0) return null;
  return (
    <FilterSelect
      label={m.group_filter()}
      allLabel={m.group_filter_all()}
      goneLabel={m.group_filter_gone()}
      options={groups}
      value={group}
      onChange={onChange}
    />
  );
}
