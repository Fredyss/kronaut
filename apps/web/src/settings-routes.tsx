import { createRoute, lazyRouteComponent, redirect } from '@tanstack/react-router';
import type { AppRoute } from './app.tsx';
import { meQuery } from './base/api/me.ts';
import { canReadSystem } from './lists/system/status.ts';

function layoutRoute(appRoute: AppRoute) {
  return createRoute({
    getParentRoute: () => appRoute,
    path: '/settings',
    component: lazyRouteComponent(() => import('./routes/settings-layout.tsx'), 'SettingsLayout'),
  });
}

type SettingsRoute = ReturnType<typeof layoutRoute>;

function accountPages(settingsRoute: SettingsRoute) {
  return [
    createRoute({
      getParentRoute: () => settingsRoute,
      path: '/',
      beforeLoad: () => {
        throw redirect({ to: '/settings/account', replace: true });
      },
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'account',
      component: lazyRouteComponent(
        () => import('./routes/settings-account.tsx'),
        'AccountSettingsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'approvals',
      component: lazyRouteComponent(
        () => import('./routes/settings-approvals.tsx'),
        'ApprovalSettingsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'notifications',
      component: lazyRouteComponent(
        () => import('./routes/settings-notifications.tsx'),
        'NotificationSettingsPage',
      ),
    }),
  ] as const;
}

function workspacePages(settingsRoute: SettingsRoute) {
  return [
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'tags',
      component: lazyRouteComponent(() => import('./routes/settings-tags.tsx'), 'TagSettingsPage'),
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'brands',
      component: lazyRouteComponent(
        () => import('./routes/settings-brands.tsx'),
        'BrandSettingsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'groups',
      component: lazyRouteComponent(
        () => import('./routes/settings-groups.tsx'),
        'GroupSettingsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'saved-texts',
      component: lazyRouteComponent(
        () => import('./routes/settings-saved-texts.tsx'),
        'SavedTextSettingsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'feeds',
      component: lazyRouteComponent(
        () => import('./routes/settings-feeds.tsx'),
        'FeedSettingsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'short-links',
      component: lazyRouteComponent(
        () => import('./routes/settings-short-links.tsx'),
        'ShortLinkSettingsPage',
      ),
    }),
  ] as const;
}

function integrationPages(settingsRoute: SettingsRoute) {
  return [
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'workspace-apps',
      component: lazyRouteComponent(
        () => import('./routes/settings-workspace-apps.tsx'),
        'WorkspaceAppSettingsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'webhooks',
      component: lazyRouteComponent(
        () => import('./routes/integrations-webhooks.tsx'),
        'WebhookSettingsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'api-keys',
      component: lazyRouteComponent(
        () => import('./routes/integrations-api-keys.tsx'),
        'ApiKeySettingsPage',
      ),
    }),
    createRoute({
      getParentRoute: () => settingsRoute,
      path: 'system',
      beforeLoad: async ({ context }) => {
        const me = await context.queryClient.ensureQueryData(meQuery(context.client));
        if (!canReadSystem(me)) {
          throw redirect({ to: '/settings/account', replace: true });
        }
      },
      component: lazyRouteComponent(
        () => import('./routes/settings-system.tsx'),
        'SystemSettingsPage',
      ),
    }),
  ] as const;
}

export function settingsRoutes(appRoute: AppRoute) {
  const settingsRoute = layoutRoute(appRoute);
  return settingsRoute.addChildren([
    ...accountPages(settingsRoute),
    ...workspacePages(settingsRoute),
    ...integrationPages(settingsRoute),
  ]);
}
