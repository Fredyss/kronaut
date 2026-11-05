import { brandsCreate, brandsUpdate } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { detailCodes, errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { useNamedCreate } from '../../base/api/named-create.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { brandsKey } from './queries.ts';

export function brandError(error: unknown): string {
  const code = errorCode(error);
  if (code === 'brand_name_taken') return settingsText.settings_brand_name_taken();
  if (code === 'brand_in_use') return settingsText.settings_brand_in_use();
  if (detailCodes(error).includes('name_invalid'))
    return settingsText.settings_brand_name_invalid();
  return apiErrorMessage(code);
}

function reportFailure(error: unknown): void {
  if (errorStatus(error) !== 401) toast(brandError(error), 'destructive');
}

export function useCreateBrand(workspaceId: string) {
  const client = useApiClient();
  return useNamedCreate({
    queryKey: brandsKey(workspaceId),
    create: async (name, headers) =>
      (await brandsCreate({ client, path: { workspaceId }, body: { name }, headers })).data,
    created: (brand) => toast(settingsText.settings_brand_created({ name: brand.name })),
  });
}

interface BrandChange {
  readonly name?: string;
  readonly archived?: boolean;
}

function savedText(body: BrandChange): string {
  if (body.archived === undefined) return settingsText.settings_brand_saved();
  return body.archived
    ? settingsText.settings_brand_archived_done()
    : settingsText.settings_brand_unarchived_done();
}

export function useUpdateBrand(workspaceId: string, brandId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: BrandChange) => {
      const headers = idempotency(keyFor(null, brandId));
      await brandsUpdate({ client, path: { workspaceId, brandId }, body, headers });
    },
    onSuccess: (_data, body) => toast(savedText(body)),
    onError: reportFailure,
    onSettled: () => queryClient.invalidateQueries({ queryKey: brandsKey(workspaceId) }),
  });
}
