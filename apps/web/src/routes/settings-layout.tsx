import { useQuery } from '@tanstack/react-query';
import { Link, Outlet } from '@tanstack/react-router';
import { meQuery } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m as settingsText } from '../i18n/settings.ts';
import { m } from '../i18n.ts';
import { canReadSystem } from '../system/status.ts';

const SECTIONS = [
  { to: '/settings/account', label: () => settingsText.settings_account_title() },
  { to: '/settings/approvals', label: () => settingsText.settings_approvals_title() },
  { to: '/settings/notifications', label: () => m.notifications_title() },
] as const;

const TAGS_SECTION = {
  to: '/settings/tags',
  label: () => settingsText.settings_tags_title(),
} as const;

const SAVED_TEXTS_SECTION = {
  to: '/settings/saved-texts',
  label: () => settingsText.settings_saved_texts_title(),
} as const;

const SETTINGS_WRITERS: ReadonlySet<string> = new Set(['owner', 'admin']);

const SYSTEM_SECTION = {
  to: '/settings/system',
  label: () => settingsText.settings_system_title(),
} as const;

const SECTION =
  '-mb-px block whitespace-nowrap border-transparent border-b-2 px-3 py-2 text-muted-foreground text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:mb-0 md:rounded-r-md md:border-b-0 md:border-l-2';
const ACTIVE = { className: 'border-primary font-medium text-foreground md:bg-accent' } as const;

export function SettingsLayout() {
  const client = useApiClient();
  const me = useQuery(meQuery(client)).data;
  const sections = [
    ...SECTIONS,
    ...(SETTINGS_WRITERS.has(me?.workspaces[0]?.role ?? '') ? [TAGS_SECTION] : []),
    SAVED_TEXTS_SECTION,
    ...(canReadSystem(me) ? [SYSTEM_SECTION] : []),
  ];
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:flex-row md:gap-10 md:p-6">
      <div className="flex flex-col gap-4 md:w-48 md:shrink-0">
        <h1 className="font-semibold text-2xl tracking-tight">{m.settings_title()}</h1>
        <nav
          aria-label={settingsText.settings_nav_label()}
          className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
        >
          <ul className="flex border-b md:flex-col md:gap-1 md:border-b-0">
            {sections.map((section) => (
              <li key={section.to}>
                <Link to={section.to} className={SECTION} activeProps={ACTIVE}>
                  {section.label()}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
