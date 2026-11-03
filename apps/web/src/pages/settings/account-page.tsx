import { type ControlIds, Select, SettingsCard, SettingsPage, SettingsRow } from '@kronaut/ui';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../base/api/client.ts';
import { meQuery } from '../../base/api/me.ts';
import { m } from '../../base/locale/i18n.ts';
import { LocaleSelect } from '../../base/locale/select.tsx';
import { m as settingsText } from '../../i18n/settings.ts';
import { chooseTheme, THEMES, type Theme, useTheme } from '../../records/theme/theme.tsx';
import { DisplayNameForm } from './display-name-form.tsx';
import { PasswordCard } from './password-form.tsx';

function themeOption(theme: Theme): string {
  switch (theme) {
    case 'system':
      return settingsText.theme_option_system();
    case 'light':
      return settingsText.theme_option_light();
    case 'dark':
      return settingsText.theme_option_dark();
  }
}

function ThemeSelect(ids: ControlIds) {
  const theme = useTheme();
  return (
    <Select
      {...ids}
      value={theme}
      onChange={(event) => {
        const next = THEMES.find((option) => option === event.currentTarget.value);
        if (next !== undefined) chooseTheme(next);
      }}
    >
      {THEMES.map((option) => (
        <option key={option} value={option}>
          {themeOption(option)}
        </option>
      ))}
    </Select>
  );
}

function Value({ value }: { readonly value: string | null }) {
  return value === null ? (
    <span className="text-muted-foreground">{settingsText.settings_not_set()}</span>
  ) : (
    <span className="truncate">{value}</span>
  );
}

export function AccountSettingsPage() {
  const client = useApiClient();
  const user = useQuery(meQuery(client)).data?.user;
  return (
    <SettingsPage title={settingsText.settings_account_title()}>
      {user === undefined ? null : (
        <SettingsCard title={settingsText.settings_profile_title()}>
          <SettingsRow label={m.login_email()}>
            <Value value={user.email} />
          </SettingsRow>
          <SettingsRow label={settingsText.settings_display_name()}>
            {(ids) => <DisplayNameForm {...ids} stored={user.displayName} />}
          </SettingsRow>
        </SettingsCard>
      )}
      <SettingsCard title={settingsText.settings_preferences_title()}>
        <SettingsRow label={m.locale_label()}>{(ids) => <LocaleSelect {...ids} />}</SettingsRow>
        <SettingsRow label={settingsText.settings_theme()}>
          {(ids) => <ThemeSelect {...ids} />}
        </SettingsRow>
      </SettingsCard>
      {user === undefined ? null : <PasswordCard />}
    </SettingsPage>
  );
}
