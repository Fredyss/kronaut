import { authLogout } from '@kronaut/sdk';
import { Button, toast } from '@kronaut/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { useId } from 'react';
import { isUnauthenticated, meQuery } from '../api.ts';
import { useApiClient } from '../context.ts';
import { useDisclosure } from '../disclosure.ts';
import { m } from '../i18n.ts';
import { LocaleSelect } from '../locale-select.tsx';
import { NotificationsBell } from '../notifications/bell.tsx';
import { Rail } from '../shell/rail.tsx';
import { ThemeToggle } from '../theme.tsx';

function LocaleSwitch() {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        {m.locale_label()}
      </label>
      <LocaleSelect id={id} />
    </div>
  );
}

function AccountMenu({ name, email }: { readonly name: string; readonly email: string | null }) {
  const { open, toggle, root, button, panelId } = useDisclosure();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: () => authLogout({ client }),
    onSuccess: async () => {
      queryClient.clear();
      await navigate({ to: '/login', replace: true });
    },
    onError: (error) => {
      if (!isUnauthenticated(error)) toast(m.error_logout_failed(), 'destructive');
    },
  });
  return (
    <div ref={root} className="relative">
      <Button
        ref={button}
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span className="max-w-40 truncate">{name}</span>
      </Button>
      {open ? (
        <div
          id={panelId}
          className="absolute right-0 z-40 mt-2 flex min-w-56 flex-col gap-3 rounded-lg border bg-popover p-3 text-popover-foreground shadow-md"
        >
          <div className="flex flex-col gap-0.5 text-sm">
            <span className="font-medium">{name}</span>
            {email === null ? null : <span className="text-muted-foreground">{email}</span>}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            {m.account_logout()}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell() {
  const client = useApiClient();
  const me = useQuery(meQuery(client)).data;
  if (me === undefined) return null;
  const workspace = me.workspaces[0];
  const name = me.user.displayName ?? me.user.email ?? m.account_menu();
  return (
    <div className="flex min-h-svh">
      <Rail workspaceId={workspace?.id} />
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="flex items-center gap-4 border-b px-4 py-2">
          {workspace === undefined ? null : (
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <span className="sr-only">{m.workspace_label()}</span>
              <span className="truncate font-medium">{workspace.name}</span>
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <LocaleSwitch />
            {workspace === undefined ? null : <NotificationsBell workspaceId={workspace.id} />}
            <AccountMenu name={name} email={me.user.email} />
          </div>
        </header>
        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
