import { approvalsBrandPolicyDelete } from '@kronaut/sdk';
import { SettingsCard, SettingsRow, Switch, toast } from '@kronaut/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApiClient } from '../../base/api/client.ts';
import { errorCode, errorStatus } from '../../base/api/errors.ts';
import { idempotency, keyFor } from '../../base/api/idempotency.ts';
import { apiErrorMessage } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import {
  approvalPolicyKey,
  type PolicyResponse,
  type StoredPolicy,
} from '../../records/approval-policy/queries.ts';
import { type Brand, brandsQuery } from '../../records/brands/queries.ts';
import { PolicyForm } from './policy-form.tsx';

function useRemoveOverride(workspaceId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (brandId: string) => {
      const headers = idempotency(keyFor(null, brandId));
      await approvalsBrandPolicyDelete({ client, path: { workspaceId, brandId }, headers });
    },
    onSuccess: () => toast(settingsText.settings_brand_override_removed()),
    onError: (error) => {
      if (errorStatus(error) !== 401) toast(apiErrorMessage(errorCode(error)), 'destructive');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: approvalPolicyKey(workspaceId) }),
  });
}

function summary(stored: StoredPolicy | undefined): string {
  if (stored === undefined) return settingsText.settings_brand_uses_workspace();
  return stored.mode === 'required'
    ? settingsText.settings_brand_required({ count: stored.requiredApprovals })
    : settingsText.settings_not_required();
}

interface OverrideRowProps {
  readonly brand: Brand;
  readonly stored: StoredPolicy | undefined;
  readonly on: boolean;
  readonly editable: boolean;
  readonly pending: boolean;
  onToggle(on: boolean): void;
}

function OverrideRow({ brand, stored, on, editable, pending, onToggle }: OverrideRowProps) {
  const switchable = editable && brand.archivedAt === null;
  return (
    <SettingsRow label={brand.name} description={summary(stored)}>
      {switchable ? (
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">{settingsText.settings_brand_override()}</span>
          <Switch
            aria-label={settingsText.settings_brand_override_of({ name: brand.name })}
            checked={on}
            disabled={pending}
            onCheckedChange={onToggle}
          />
        </span>
      ) : null}
    </SettingsRow>
  );
}

interface BrandOverridesProps {
  readonly workspaceId: string;
  readonly policy: PolicyResponse;
  readonly editable: boolean;
}

export function BrandOverrides({ workspaceId, policy, editable }: BrandOverridesProps) {
  const client = useApiClient();
  const brands = useQuery(brandsQuery(client, workspaceId)).data;
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const remove = useRemoveOverride(workspaceId);
  const storedFor = (id: string) => policy.brands.find((item) => item.brandId === id);
  const shown = (brands ?? []).filter(
    (brand) => brand.archivedAt === null || storedFor(brand.id) !== undefined,
  );
  if (shown.length === 0) return null;
  const isOn = (id: string) => storedFor(id) !== undefined || opened.has(id);
  const setOpen = (id: string, open: boolean) =>
    setOpened((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggle = (id: string, on: boolean) => {
    setOpen(id, on);
    if (!on && storedFor(id) !== undefined) remove.mutate(id);
  };
  const fallback = policy.workspace ?? policy.effective;
  return (
    <>
      <SettingsCard title={settingsText.settings_brands_title()}>
        <p className="px-6 py-4 text-muted-foreground text-sm">
          {settingsText.settings_brand_strictest()}
        </p>
        {shown.map((brand) => (
          <OverrideRow
            key={brand.id}
            brand={brand}
            stored={storedFor(brand.id)}
            on={isOn(brand.id)}
            editable={editable}
            pending={remove.isPending}
            onToggle={(on) => toggle(brand.id, on)}
          />
        ))}
      </SettingsCard>
      {shown
        .filter((brand) => editable && brand.archivedAt === null && isOn(brand.id))
        .map((brand) => {
          const stored = storedFor(brand.id);
          return (
            <PolicyForm
              key={`${brand.id}-${stored?.version ?? 0}`}
              title={settingsText.settings_brand_policy_title({ name: brand.name })}
              workspaceId={workspaceId}
              brandId={brand.id}
              version={stored?.version}
              initial={stored ?? fallback}
              editable={editable}
            />
          );
        })}
    </>
  );
}
