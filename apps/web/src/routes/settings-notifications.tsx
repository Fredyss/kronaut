import { useQuery } from '@tanstack/react-query';
import { meQuery } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { SettingsCard, SettingsPage, SettingsRow } from '../settings/card.tsx';
import {
  type EmailPreferences,
  emailPreferencesQuery,
  useSaveEmailPreferences,
} from '../settings/email-preferences.ts';
import { Switch } from '../settings/switch.tsx';

const ROWS = [
  {
    key: 'failures',
    label: () => m.settings_email_failures(),
    hint: () => m.settings_email_failures_hint(),
  },
  {
    key: 'approvals',
    label: () => m.settings_email_approvals(),
    hint: () => m.settings_email_approvals_hint(),
  },
  {
    key: 'channels',
    label: () => m.settings_email_channels(),
    hint: () => m.settings_email_channels_hint(),
  },
] as const satisfies readonly {
  readonly key: keyof EmailPreferences;
  label(): string;
  hint(): string;
}[];

function EmailPreferencesCard({ workspaceId }: { readonly workspaceId: string }) {
  const client = useApiClient();
  const preferences = useQuery(emailPreferencesQuery(client, workspaceId));
  const save = useSaveEmailPreferences(workspaceId);
  const email = preferences.data;
  if (email === undefined) {
    return preferences.isError ? (
      <p role="alert" className="text-destructive text-sm">
        {m.error_generic()}
      </p>
    ) : (
      <p className="text-muted-foreground text-sm">{m.loading()}</p>
    );
  }
  return (
    <SettingsCard title={m.settings_email_title()}>
      {ROWS.map((row) => (
        <SettingsRow key={row.key} label={row.label()} description={row.hint()}>
          {(ids) => (
            <Switch
              {...ids}
              checked={email[row.key]}
              onCheckedChange={(on) => save.mutate({ key: row.key, on })}
            />
          )}
        </SettingsRow>
      ))}
    </SettingsCard>
  );
}

export function NotificationSettingsPage() {
  const client = useApiClient();
  const workspace = useQuery(meQuery(client)).data?.workspaces[0];
  return (
    <SettingsPage title={m.notifications_title()}>
      {workspace === undefined ? null : <EmailPreferencesCard workspaceId={workspace.id} />}
      <p className="text-muted-foreground text-sm">{m.settings_in_app_note()}</p>
    </SettingsPage>
  );
}
