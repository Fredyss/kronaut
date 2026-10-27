import { useQuery } from '@tanstack/react-query';
import { meQuery } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { LocaleSelect, SELECT } from '../locale-select.tsx';
import { type ControlIds, SettingsCard, SettingsPage, SettingsRow } from '../settings/card.tsx';
import { DisplayNameForm } from '../settings/display-name-form.tsx';
import { PasswordCard } from '../settings/password-form.tsx';
import { chooseTheme, THEMES, type Theme, useTheme } from '../theme.tsx';

function themeOption(theme: Theme): string {
  switch (theme) {
    case 'system':
      return m.theme_option_system();
    case 'light':
      return m.theme_option_light();
    case 'dark':
      return m.theme_option_dark();
  }
}

function ThemeSelect(ids: ControlIds) {
  const theme = useTheme();
  return (
    <select
      {...ids}
      value={theme}
      onChange={(event) => {
        const next = THEMES.find((option) => option === event.currentTarget.value);
        if (next !== undefined) chooseTheme(next);
      }}
      className={SELECT}
    >
      {THEMES.map((option) => (
        <option key={option} value={option}>
          {themeOption(option)}
        </option>
      ))}
    </select>
  );
}

function Value({ value }: { readonly value: string | null }) {
  return value === null ? (
    <span className="text-muted-foreground">{m.settings_not_set()}</span>
  ) : (
    <span className="truncate">{value}</span>
  );
}

export function AccountSettingsPage() {
  const client = useApiClient();
  const user = useQuery(meQuery(client)).data?.user;
  return (
    <SettingsPage title={m.settings_account_title()}>
      {user === undefined ? null : (
        <SettingsCard title={m.settings_profile_title()}>
          <SettingsRow label={m.login_email()}>
            <Value value={user.email} />
          </SettingsRow>
          <SettingsRow label={m.settings_display_name()}>
            {(ids) => <DisplayNameForm {...ids} stored={user.displayName} />}
          </SettingsRow>
        </SettingsCard>
      )}
      <SettingsCard title={m.settings_preferences_title()}>
        <SettingsRow label={m.locale_label()}>{(ids) => <LocaleSelect {...ids} />}</SettingsRow>
        <SettingsRow label={m.settings_theme()}>{(ids) => <ThemeSelect {...ids} />}</SettingsRow>
      </SettingsCard>
      {user === undefined ? null : <PasswordCard />}
    </SettingsPage>
  );
}
