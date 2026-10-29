import { useQuery } from '@tanstack/react-query';
import { meQuery } from '../api.ts';
import { PolicyForm } from '../approvals/policy-form.tsx';
import { approvalPolicyQuery, type StoredPolicy } from '../approvals/queries.ts';
import { useApiClient } from '../context.ts';
import { m as settingsText } from '../i18n/settings.ts';
import { m } from '../i18n.ts';
import { SettingsCard, SettingsPage, SettingsRow } from '../settings/card.tsx';

const EDITORS: ReadonlySet<string> = new Set(['owner', 'admin']);

function BrandOverrides({ brands }: { readonly brands: readonly StoredPolicy[] }) {
  if (brands.length === 0) return null;
  return (
    <SettingsCard title={settingsText.settings_brands_title()}>
      {brands.map((brand) => (
        <SettingsRow key={brand.brandId} label={brand.brandId ?? ''}>
          {brand.mode === 'required'
            ? settingsText.settings_brand_required({ count: brand.requiredApprovals })
            : settingsText.settings_not_required()}
        </SettingsRow>
      ))}
    </SettingsCard>
  );
}

function ApprovalSettings({ workspaceId, role }: { workspaceId: string; role: string }) {
  const client = useApiClient();
  const policy = useQuery(approvalPolicyQuery(client, workspaceId));
  const editable = EDITORS.has(role);
  if (policy.isError && policy.data === undefined) {
    return (
      <p role="alert" className="text-destructive text-sm">
        {m.error_generic()}
      </p>
    );
  }
  if (policy.data === undefined) {
    return <p className="text-muted-foreground text-sm">{m.loading()}</p>;
  }
  return (
    <>
      {editable ? null : (
        <p className="text-muted-foreground text-sm">{settingsText.settings_read_only()}</p>
      )}
      {policy.data.workspace === null ? (
        <p className="text-muted-foreground text-sm">{settingsText.settings_defaults()}</p>
      ) : null}
      <PolicyForm
        key={policy.data.workspace?.version ?? 0}
        workspaceId={workspaceId}
        policy={policy.data}
        editable={editable}
      />
      <BrandOverrides brands={policy.data.brands} />
    </>
  );
}

export function ApprovalSettingsPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <SettingsPage
      title={settingsText.settings_approvals_title()}
      intro={settingsText.settings_approvals_intro()}
    >
      {workspace === undefined ? null : (
        <ApprovalSettings workspaceId={workspace.id} role={workspace.role} />
      )}
    </SettingsPage>
  );
}
