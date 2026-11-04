# Web structure

Which way imports run between the folders of `apps/web/src`, what a route file may hold, and where a new page or module goes. Read it before adding a page or moving code between web folders.

**Status:** done. `pnpm check` keeps the web folders free of loops and in tier order, and the route files thin. The problem section is as measured at `f6517c9`. [Code structure](13-code-structure.md) holds the general rules; this chapter applies them to the web app, as [Scheduling flow](14-scheduling-flow.md) does for the server.

## The problem

Measured at `f6517c9`, files had no import cycle, but folders did:

- **Two folder loops.** One spanned `approvals`, `calendar`, `compose`, `inbox`, `notifications`, `post-actions` and `routes/compose.tsx`; the other `channels` and `saved-texts`.
- **Shared rules sat in the folder that needed them first.** Post permissions and media reads lived in `post-actions`, the approval policy in `approvals`, the content document in `compose`, and the browser's time zone and the date formats in `calendar`.
- **16 of the 21 route files held page bodies,** with queries, mutations and forms. A feature reached the composer through `routes/compose.tsx`.

## Direction

Each tier imports only tiers below it. Folders in one tier don't import each other (checked).

| Tier | Tier folder | Features | Owns |
|---|---|---|---|
| 1. Pages | `pages/` | `post-page`, `channels-page`, `shell`, `settings` | Pages that put several features on one screen, the app chrome, the account and notification settings |
| 2. Views | `views/` | `calendar`, `approvals`, `evergreen` | The planning calendar, approval requests and decisions, the evergreen section |
| 3. Actions | `actions/` | `post-actions`, `post-import`, `notifications` | Post menus and dialogs that open the composer, the CSV import dialog, the notification bell and panel |
| 4. Lists | `lists/` | `inbox`, `media`, `system`, `rss-feeds` | The needs-action inbox, the media library, system status, RSS feeds |
| 5. Composer | `composer/` | `compose` | Drafting, editing, scheduling and submitting a post |
| 6. Content | `content/` | `saved-texts`, `tags`, `series`, `short-links` | Reusable text and channel signatures, labels, repeat rules, link shortening |
| 7. Records | `records/` | `posts`, `channels`, `approval-policy`, `analytics`, `auth`, `theme` | Post queries and rules, the content document, channels and their dialogs, the approval policy, metrics, sign-in, the theme |
| Base | `base/` | `api`, `locale`, `providers`, `ui`, plus `@kronaut/*` | Client and errors, messages and formatting, platform names, app-wide UI |

A feature in tiers 1 to 7 imports another feature only through a line in [`feature-imports.json`](../../tools/lint/feature-imports.json); a base folder needs none. Type-only imports are outside both.

The tier check reads production value imports: a feature folder imports only lower tiers, base folders and the `i18n` catalogs, never a route file or a `src` root file. The catalogs in turn import only base folders and packages, so no feature reaches another through them. Each feature folder sits in the folder of its tier, as `apps/web/src/<tier folder>/<feature>/`, so the tree shows the direction, and a folder outside a tier folder fails the check. A new feature goes into its tier folder; a new tier goes into this table and [`tools/lint/folders.ts`](../../tools/lint/folders.ts) in the same PR. Moving a feature to another tier is a design decision, like a declared import.

`approval-policy` sits beside `approvals`, as on the server: `compose` reads the policy, and `approvals` reuses `compose/when/*` and `compose/issues.ts`, so a subfolder would keep the loop.

## Base folders

`api`, `locale`, `providers` and `ui` sit in `base/` and value-import only packages, their own files and each other (checked). `providers` qualifies because `providers/ui.ts` reads only `locale`.

`locale` holds everything about the reader's language and clock: messages, `useFormat` and `useFormats`, and in `locale/browser.ts` the browser's time zone, language and first day of the week.

## Wiring

- **`app.tsx`** builds the route tree: paths, `validateSearch`, `beforeLoad`, and which route file each route loads, lazily unless the page is in the shell. It also creates the query client and the router.
- **`routes/`** holds one file per page, which re-exports that page from its feature, including `not-found.tsx` (from `shell/`), plus `locale-root.tsx`, the locale gate around the router.
- **`i18n/`** holds the message catalogs of the route groups (`compose`, `calendar`, `media`, `inbox`, `settings`). A file imports a group only if every route that loads it belongs to that group (checked by `i18n/route-catalogs.test.ts`).
- **`main.tsx`** applies the theme and renders the app. The `src` root holds only these two files, `styles.css`, `routes/`, `i18n/`, `base/` and the tier folders (checked).

Each file in `routes/` and `i18n/` is a node of its own in the folder check, so `app.tsx` loading every page is no loop, but a feature importing a route file that imports the feature is.

## Route files

A route file re-exports the page its route loads, and nothing else. Two checks hold this: a route file other than the locale gate `locale-root.tsx` holds only `export { … } from` lines, and no route file imports or re-exports `@tanstack/react-query` or `api/client.ts`. The page, its queries, mutations and forms live in the owning feature. Search validation and a guard live on the route in `app.tsx`, reading through a feature's query options:

```tsx
// app.tsx
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

// routes/settings-system.tsx
export { SystemSettingsPage } from '../system/settings-page.tsx';
```

The route file stays because Vite names a lazy chunk after the module it loads, and [`.size-limit.js`](../../apps/web/.size-limit.js) budgets each route by that name. When a feature also loads a page lazily, as `post-actions` and `post-page` load the composer, the route's chunk becomes a small facade and the page gets a chunk of its own, named after its file. Each budget names its chunks exactly, so the composer entry lists both `compose` and `compose-page`; a new page chunk like that needs adding to its entry, or it counts as shared lazy.

A page reads its own search and params with `getRouteApi`, as before.

## Where new code goes

- **A new page:** a `<name>-page.tsx` in the feature it's about, a route file that re-exports it, the route in `app.tsx`, and a budget in `.size-limit.js`.
- **A page that puts features from different tiers on one screen:** a `<name>-page` folder in `pages/`, tier 1, like `post-page` and `channels-page`.
- **A settings page:** in the feature it configures (`tags/settings-page.tsx`, `approvals/settings-page.tsx`). Account-wide pages stay in `settings`.
- **A rule or query that several features read about posts:** `posts`. Only `destinations.ts`, `queries.ts` and `summary.ts` there join the shell's `data` chunk ([`vite.config.ts`](../../apps/web/vite.config.ts)), so a new file stays lazy unless you add it.
- **A browser or locale read, or a date format:** `locale`.
- **Something a lower folder needs from a higher one:** move that piece down to the folder that owns its concept, the way the moves below did. Don't add an import upward.

## Moves

One PR, one commit per step. Every page, URL, search param, query key, mutation and message is unchanged.

| Step | Moves |
|---|---|
| 1. Thin routes | 16 page bodies to their features: `calendar`, `compose`, `inbox`, `media`, `post-page` (`*-page.tsx`), `channels` (later `channels-page`), `auth` (login, reset password, and `auth-layout.tsx`), `settings` (account, notifications, layout), `approvals`, `saved-texts`, `system` and `tags` (`settings-page.tsx`), `shell/app-shell.tsx`. `login.test.tsx` and `post.test.tsx` moved beside their pages. |
| 2. Loops | `post-actions/{permissions,post-editable,post-media}.ts` and `compose/content/doc.ts` to `posts`. The policy reads of `approvals/queries.ts` to `approval-policy/queries.ts`; `approvalBody` to `compose/submit/approval-body.ts`. `calendar/formats.ts` and the browser reads of `calendar/time.ts` to `locale`. `channels/signature.tsx` to `saved-texts/channel-signature.tsx`, and the channels page to `channels-page`, since it shows both. |
| 3. Checks | `folderCycles` for `web` and `fetchingRoutes` in `tools/lint/structure.test.ts`. |
| 4. This chapter | `providers` becomes a base folder. |

## Rejected

- **Route definitions in the route files:** they would move every route out of `app.tsx` and rename every lazy chunk, for no change a reader sees. It can come later as its own PR.
- **Slots or callbacks to keep the channels page in `channels`:** a dependency hidden at runtime is harder to follow, as on the server.
