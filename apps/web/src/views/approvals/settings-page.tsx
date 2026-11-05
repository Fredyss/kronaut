import { SettingsPage } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { meQuery } from '../../base/api/me.ts';
import { m } from '../../base/locale/i18n.ts';
import { m as settingsText } from '../../i18n/settings.ts';
import { approvalPolicyQuery } from '../../records/approval-policy/queries.ts';
import { BrandOverrides } from './brand-overrides.tsx';
import { PolicyForm } from './policy-form.tsx';

const EDITORS: ReadonlySet<string> = new Set(['owner', 'admin']);

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
        title={settingsText.settings_policy_title()}
        workspaceId={workspaceId}
        version={policy.data.workspace?.version}
        initial={policy.data.workspace ?? policy.data.effective}
        editable={editable}
      />
      <BrandOverrides workspaceId={workspaceId} policy={policy.data} editable={editable} />
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
