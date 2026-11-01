import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useApiClient } from '../context.ts';
import { m as calendarText } from '../i18n/calendar.ts';
import { SELECT } from '../locale-select.tsx';
import { tagsQuery } from '../tags/picker.tsx';
import type { CalendarSearch } from './search.ts';

const route = getRouteApi('/app/');

interface TagFilterProps {
  readonly workspaceId: string;
  readonly tag: string | undefined;
}

export function TagFilter({ workspaceId, tag }: TagFilterProps) {
  const client = useApiClient();
  const navigate = route.useNavigate();
  const tags = useQuery(tagsQuery(client, workspaceId)).data;
  const known = tags?.some((item) => item.id === tag) === true;
  const fallback =
    tags === undefined ? calendarText.calendar_tag_current() : calendarText.calendar_tag_gone();
  const choose = (value: string) =>
    void navigate({
      to: '/',
      search: (prev) => {
        const { tag: _, ...rest } = prev as CalendarSearch;
        return value === '' ? rest : { ...rest, tag: value };
      },
    });
  return (
    <select
      aria-label={calendarText.calendar_tag_filter()}
      value={tag ?? ''}
      onChange={(event) => choose(event.currentTarget.value)}
      className={SELECT}
    >
      <option value="">{calendarText.calendar_tags_all()}</option>
      {tag === undefined || known ? null : <option value={tag}>{fallback}</option>}
      {tags?.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  );
}
