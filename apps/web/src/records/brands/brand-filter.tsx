import { Select } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { m } from '../../base/locale/i18n.ts';
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
  const known = brand === NO_BRAND || brands.some((item) => item.id === brand);
  return (
    <Select
      aria-label={m.brand_filter()}
      value={brand ?? ''}
      onChange={(event) => onChange(event.currentTarget.value || undefined)}
    >
      <option value="">{m.brand_filter_all()}</option>
      {brand === undefined || known ? null : <option value={brand}>{m.brand_filter_gone()}</option>}
      {brands.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
      <option value={NO_BRAND}>{m.brand_none()}</option>
    </Select>
  );
}
