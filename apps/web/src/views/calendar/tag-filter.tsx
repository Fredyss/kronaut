import { Select } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { useApiClient } from '../../base/api/client.ts';
import { tagsQuery } from '../../content/tags/picker.tsx';
import { m as calendarText } from '../../i18n/calendar.ts';
import { BrandFilter } from '../../records/brands/brand-filter.tsx';
import type { PostFilter } from '../../records/posts/queries.ts';
import type { CalendarSearch } from './search.ts';

const route = getRouteApi('/app/');

interface TagFilterProps {
  readonly workspaceId: string;
  readonly tag: string | undefined;
}

function TagFilter({ workspaceId, tag }: TagFilterProps) {
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
    <Select
      aria-label={calendarText.calendar_tag_filter()}
      value={tag ?? ''}
      onChange={(event) => choose(event.currentTarget.value)}
    >
      <option value="">{calendarText.calendar_tags_all()}</option>
      {tag === undefined || known ? null : <option value={tag}>{fallback}</option>}
      {tags?.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </Select>
  );
}

export function Filters({ workspaceId, filter }: { workspaceId: string; filter: PostFilter }) {
  const navigate = route.useNavigate();
  const chooseBrand = (brand: string | undefined) =>
    void navigate({
      to: '/',
      search: (prev) => {
        const { brand: _, ...rest } = prev as CalendarSearch;
        return brand === undefined ? rest : { ...rest, brand };
      },
    });
  return (
    <>
      <TagFilter workspaceId={workspaceId} tag={filter.tag} />
      <BrandFilter workspaceId={workspaceId} brand={filter.brand} onChange={chooseBrand} />
    </>
  );
}
