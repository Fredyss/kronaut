import { type BrandsListResponse, brandsList, type Client } from '@kronaut/sdk';
import { queryOptions } from '@tanstack/react-query';

export type Brand = BrandsListResponse['items'][number];

export const BRAND_NAME_MAX = 120;

export function brandsKey(workspaceId: string) {
  return ['brands', workspaceId] as const;
}

export function brandsQuery(client: Client, workspaceId: string) {
  return queryOptions({
    queryKey: brandsKey(workspaceId),
    queryFn: async () => (await brandsList({ client, path: { workspaceId } })).data.items,
    staleTime: 60_000,
  });
}

export function activeBrands(brands: readonly Brand[]): Brand[] {
  return brands.filter((brand) => brand.archivedAt === null);
}

export interface BrandGroup<T> {
  readonly brand: Brand | null;
  readonly items: readonly T[];
}

export function groupByBrand<T extends { readonly brandId: string | null }>(
  items: readonly T[],
  brands: readonly Brand[],
): BrandGroup<T>[] {
  const known = new Set(brands.map((brand) => brand.id));
  const branded = brands
    .map((brand) => ({ brand, items: items.filter((item) => item.brandId === brand.id) }))
    .filter((group) => group.items.length > 0);
  const rest = items.filter((item) => item.brandId === null || !known.has(item.brandId));
  return rest.length === 0 ? branded : [...branded, { brand: null, items: rest }];
}
