import { channelsSetBrand } from '@kronaut/sdk';
import { Select, toast } from '@kronaut/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { meQuery } from '../../base/api/me.ts';
import { apiErrorMessage, m } from '../../base/locale/i18n.ts';
import { activeBrands, brandsKey, brandsQuery } from '../../records/brands/queries.ts';
import { type Channel, channelsKey } from '../../records/channels/queries.ts';
import { postsKey } from '../../records/posts/queries.ts';

const ASSIGN_ROLES: ReadonlySet<string> = new Set(['owner', 'admin']);

function brandFailure(error: unknown): string {
  const code = errorCode(error);
  return code === 'brand_archived' ? m.channels_brand_archived() : apiErrorMessage(code);
}

function useSetBrand(workspaceId: string, channelId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (brandId: string | null) => {
      const headers = idempotency(keyFor(null, `${channelId}:${brandId}`));
      const path = { workspaceId, channelId };
      await channelsSetBrand({ client, path, body: { brandId }, headers });
    },
    onSuccess: () => toast(m.channels_brand_saved()),
    onError: (error) => {
      if (errorStatus(error) !== 401) toast(brandFailure(error), 'destructive');
    },
    onSettled: () =>
      Promise.all(
        [channelsKey, brandsKey, postsKey].map((key) =>
          queryClient.invalidateQueries({ queryKey: key(workspaceId) }),
        ),
      ),
  });
}

function BrandSelect({ workspaceId, channel }: { workspaceId: string; channel: Channel }) {
  const client = useApiClient();
  const brands = activeBrands(useQuery(brandsQuery(client, workspaceId)).data ?? []);
  const save = useSetBrand(workspaceId, channel.id);
  if (brands.length === 0) return null;
  const value = save.isPending ? save.variables : channel.brandId;
  return (
    <Select
      aria-label={m.channels_brand_of({ name: channel.displayName })}
      value={value ?? ''}
      disabled={save.isPending}
      onChange={(event) => save.mutate(event.currentTarget.value || null)}
      className="w-fit"
    >
      <option value="">{m.brand_none()}</option>
      {brands.map((brand) => (
        <option key={brand.id} value={brand.id}>
          {brand.name}
        </option>
      ))}
    </Select>
  );
}

export function ChannelBrand({ channel }: { readonly channel: Channel }) {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  if (workspace === undefined || !ASSIGN_ROLES.has(workspace.role)) return null;
  return <BrandSelect workspaceId={workspace.id} channel={channel} />;
}
