import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { m } from '../../base/locale/i18n.ts';
import { FilterSelect } from '../../base/ui/filter-select.tsx';
import { brandsQuery } from './queries.ts';
import { NO_BRAND } from './search.ts';

interface BrandFilterProps {
  readonly workspaceId: string;
  readonly brand: string | undefined;
  onChange(brand: string | undefined): void;
}

export function BrandFilter({ workspaceId, brand, onChange }: BrandFilterProps) {
  const client = useApiClient();
  const brands = useQuery(brandsQuery(client, workspaceId)).data;
  if (brands === undefined || brands.length === 0) return null;
  return (
    <FilterSelect
      label={m.brand_filter()}
      allLabel={m.brand_filter_all()}
      goneLabel={m.brand_filter_gone()}
      options={[...brands, { id: NO_BRAND, name: m.brand_none() }]}
      value={brand}
      onChange={onChange}
    />
  );
}
