import { ApiRequestError, type Client } from '@kronaut/sdk';
import { Toaster } from '@kronaut/ui';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Outlet,
  type RouterHistory,
  redirect,
} from '@tanstack/react-router';
import { isUnauthenticated, ME_KEY, meQuery } from './api.ts';
import { calendarSearch } from './calendar-search.ts';
import { composeSearch, postSearch } from './compose-search.ts';
import { ApiClientContext } from './context.ts';
import { browserLanguages, loadLocale, m, pickLocale } from './i18n.ts';
import { LocaleRoot } from './locale-root.tsx';
import { ChannelsPage, type ChannelsSearch } from './routes/channels.tsx';
import { LoginPage, type LoginSearch } from './routes/login.tsx';
import { NotFoundPage } from './routes/not-found.tsx';
import { ResetPasswordPage } from './routes/reset-password.tsx';
import { AppShell } from './routes/shell.tsx';
import { canReadSystem } from './system/status.ts';

export interface RouterContext {
  readonly queryClient: QueryClient;
  readonly client: Client;
}

function Root() {
  return (
    <>
      <Outlet />
      <Toaster dismissLabel={m.dismiss()} />
    </>
  );
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Root,
  notFoundComponent: NotFoundPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    ...(typeof search.next === 'string' ? { next: search.next } : {}),
    ...(search.reason === 'expired' || search.reason === 'password_set'
      ? { reason: search.reason }
      : {}),
  }),
  component: LoginPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: async ({ context, location }) => {
    try {
      const me = await context.queryClient.ensureQueryData(meQuery(context.client));
      await loadLocale(pickLocale(me.user.locale, browserLanguages())).catch(() => undefined);
    } catch (error) {
      if (isUnauthenticated(error)) {
        throw redirect({ to: '/login', search: { next: location.href } });
      }
      throw error;
    }
  },
  component: AppShell,
});

const homeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  validateSearch: calendarSearch,
  component: lazyRouteComponent(() => import('./routes/calendar.tsx'), 'CalendarPage'),
});

const SEARCH_VALUE_MAX = 64;
const PUBLIC_ID_LIST_MAX = 100 * 32;

function searchValue(value: unknown, max = SEARCH_VALUE_MAX): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= max ? value : undefined;
}

const channelsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/channels',
  validateSearch: (search: Record<string, unknown>): ChannelsSearch => {
    const connected = searchValue(search.connected, PUBLIC_ID_LIST_MAX);
    const error = searchValue(search.error);
    return {
      ...(connected === undefined ? {} : { connected }),
      ...(error === undefined ? {} : { error }),
    };
  },
  component: ChannelsPage,
});

const composeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/compose',
  validateSearch: composeSearch,
  component: lazyRouteComponent(() => import('./routes/compose.tsx'), 'ComposePage'),
});

const inboxRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/inbox',
  component: lazyRouteComponent(() => import('./routes/inbox.tsx'), 'InboxPage'),
});

const mediaRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/media',
  component: lazyRouteComponent(() => import('./routes/media.tsx'), 'MediaPage'),
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/settings',
  component: lazyRouteComponent(() => import('./routes/settings-layout.tsx'), 'SettingsLayout'),
});

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/settings/account', replace: true });
  },
});

const accountSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'account',
  component: lazyRouteComponent(
    () => import('./routes/settings-account.tsx'),
    'AccountSettingsPage',
  ),
});

const approvalSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'approvals',
  component: lazyRouteComponent(
    () => import('./routes/settings-approvals.tsx'),
    'ApprovalSettingsPage',
  ),
});

const notificationSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'notifications',
  component: lazyRouteComponent(
    () => import('./routes/settings-notifications.tsx'),
    'NotificationSettingsPage',
  ),
});

const tagSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'tags',
  component: lazyRouteComponent(() => import('./routes/settings-tags.tsx'), 'TagSettingsPage'),
});

const systemSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: 'system',
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(meQuery(context.client));
    if (!canReadSystem(me)) {
      throw redirect({ to: '/settings/account', replace: true });
    }
  },
  component: lazyRouteComponent(() => import('./routes/settings-system.tsx'), 'SystemSettingsPage'),
});

const postRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/posts/$postId',
  validateSearch: postSearch,
  component: lazyRouteComponent(() => import('./routes/post.tsx'), 'PostPage'),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  resetPasswordRoute,
  appRoute.addChildren([
    homeRoute,
    channelsRoute,
    composeRoute,
    inboxRoute,
    mediaRoute,
    postRoute,
    settingsRoute.addChildren([
      settingsIndexRoute,
      accountSettingsRoute,
      approvalSettingsRoute,
      notificationSettingsRoute,
      tagSettingsRoute,
      systemSettingsRoute,
    ]),
  ]),
]);

function retry(failures: number, error: unknown): boolean {
  if (error instanceof ApiRequestError && error.status > 0 && error.status < 500) return false;
  return failures < 2;
}

export function createApp(client: Client, history?: RouterHistory) {
  let router: AppRouter | null = null;
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => expired(error, query.meta) }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => expired(error, mutation.meta),
    }),
    defaultOptions: { queries: { retry } },
  });
  function expired(error: unknown, meta: Readonly<Record<string, unknown>> | undefined): void {
    if (!isUnauthenticated(error) || meta?.authAttempt === true) return;
    if (queryClient.getQueryData(ME_KEY) === undefined) return;
    queryClient.clear();
    void router?.navigate({ to: '/login', search: { reason: 'expired' } });
  }
  router = buildRouter({ queryClient, client }, history);
  return { router, queryClient };
}

function buildRouter(context: RouterContext, history?: RouterHistory) {
  return createRouter({
    routeTree,
    context,
    defaultPreload: 'intent',
    scrollRestoration: true,
    ...(history === undefined ? {} : { history }),
  });
}

export type AppRouter = ReturnType<typeof buildRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}

declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: { authAttempt?: boolean };
    mutationMeta: { authAttempt?: boolean };
  }
}

interface AppProps {
  readonly router: AppRouter;
  readonly queryClient: QueryClient;
  readonly client: Client;
}

export function App({ router, queryClient, client }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientContext value={client}>
        <LocaleRoot router={router} client={client} />
      </ApiClientContext>
    </QueryClientProvider>
  );
}
