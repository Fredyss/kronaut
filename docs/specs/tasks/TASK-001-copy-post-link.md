---
id: TASK-001
prd: PRD-001
title: Add a "Copy link" button to each published destination on the post page
kind: logic
depends_on: []
touches:
  - apps/web/src/pages/post-page/copy-link.tsx
  - apps/web/src/pages/post-page/post-page.tsx
  - apps/web/src/pages/post-page/post-page.test.tsx
  - packages/i18n/messages/en.json
  - packages/i18n/messages/sk.json
  - packages/i18n/messages/cs.json
  - packages/i18n/src/paraglide/**
interface:
  - module: apps/web/src/pages/post-page/copy-link.tsx
    change: add
    signature: "export function CopyLink({ url }: { readonly url: string }): ReactNode"
acceptance:
  - On /posts/$postId, a destination row shows a button named "Copy link" exactly when it shows the "View post" link; the test fixture (one https destination, one `javascript:` destination) renders exactly one such button, and a destination whose remoteUrl is null renders none.
  - Clicking the button calls navigator.clipboard.writeText once with the row's https address unchanged ("https://bsky.app/profile/ada/post/1" for the fixture) and shows the toast "Link copied." with role "status"; the button stays enabled and keeps its label.
  - With two https destinations each button copies its own row's address, and clicking the same button twice calls writeText twice and shows two toasts.
  - When writeText rejects, and when navigator.clipboard is undefined, a click shows the toast "Couldn't copy the link." with role "alert", and no error or unhandled rejection is thrown.
  - The messages post_copy_link, post_link_copied and post_link_copy_failed exist in en, sk and cs with exactly the strings in the table below, and `pnpm check` passes.
if_unsure:
  - Follow the "View post" link in apps/web/src/pages/post-page/post-page.tsx for placement, visibility and styling.
  - Follow apps/web/src/actions/post-actions/delete-dialog.tsx and duplicate.ts for how toasts are raised.
  - Prefer the smaller change; no new shared component, no new feature import, no new dependency.
  - Prefer showing nothing over copying a value that httpsUrl did not accept.
  - If the change would need a line in tools/lint/feature-imports.json, a higher bundle budget or any protected path, stop and report instead of working around it.
  - If Biome's file or function line limit fires on post-page.tsx or DestinationRow, stop and report; do not extract or refactor to get under it.
  - Use the classes text-foreground underline underline-offset-4 exactly as given, although the string already appears elsewhere; no shared component. PRD-001 decides this, and the "Don't copy primitive styling" rule in docs/architecture/13-code-structure.md is about packages/ui primitives such as selects and dialogs, not a text-link style.
  - Treat anything that goes wrong while copying (clipboard missing, writeText missing, a synchronous throw, a rejection) as the one failure case with the destructive toast.
  - In the test file, sharing the app and client setup through a helper inside post-page.test.tsx is allowed, as long as the existing assertions stay as they are.
  - If the session can build the web app, also run `pnpm --filter @kronaut/web size` after `pnpm check`; if a budget is exceeded, stop and report.
out_of_scope:
  - Changing any file outside touches.
  - A copy button in the inbox row, the calendar, the post preview or for short links.
  - Copying the address of the post page in Kronaut.
  - Changing the copied address (shortening, UTM parameters, trimming).
  - A fallback copy method such as document.execCommand.
  - A loading, disabled or "Copied" state on the button, a debounce, or an icon.
  - Hiding the button when navigator.clipboard is missing.
  - Moving the component to packages/ui or apps/web/src/base/ui.
  - Refactoring post-page.tsx beyond rendering the new component.
  - Changing any existing message, or hand-editing files under packages/i18n/src/paraglide.
dependencies_allowed: false
---

# TASK-001: Add a "Copy link" button to each published destination on the post page

## Context

Delivers the whole of [PRD-001](../PRD-001-copy-post-link.md): on the post detail page, each destination that has a public address on its platform gets a "Copy link" button beside "View post", which puts that address on the clipboard and confirms with a toast. It is the only task of the PRD and depends on nothing.

## Behaviour

- **Visibility:** `DestinationRow` in `post-page.tsx` renders `<CopyLink url={link} />` inside the existing `link === null ? null : …` branch, as the next sibling of the "View post" anchor (the two wrapped in a fragment), in the same wrapping line. `link` is `httpsUrl(destination.remoteUrl)`. The destination's state plays no part.
- **Copy:** a click writes `url`, unchanged, as plain text through `navigator.clipboard.writeText`. The value is the prop at click time.
- **Success:** when the write resolves, `toast(m.post_link_copied())` in the default variant.
- **Failure:** when `navigator.clipboard` is undefined or `writeText` rejects, `toast(m.post_link_copy_failed(), 'destructive')`. No retry, no fallback, no log, nothing thrown.
- **Repeat:** every click copies again and raises another toast.
- **Element:** a native `<button type="button">` with the classes `text-foreground underline underline-offset-4`. Not the `Button` primitive. No icon, no `aria-label`, one visual state.
- **Messages,** added after `post_view` in `packages/i18n/messages/{en,sk,cs}.json`:

  | Key | en | sk | cs |
  | --- | --- | --- | --- |
  | `post_copy_link` | Copy link | Kopírovať odkaz | Kopírovat odkaz |
  | `post_link_copied` | Link copied. | Odkaz je skopírovaný. | Odkaz je zkopírovaný. |
  | `post_link_copy_failed` | Couldn't copy the link. | Odkaz sa nepodarilo skopírovať. | Odkaz se nepodařilo zkopírovat. |

## Notes

- `post-page.tsx` has 296 lines, 283 as Biome counts them (blank lines skipped) against a limit of 300, and `DestinationRow` is its longest piece of markup. The component has its own file so that the change in `post-page.tsx` is one import, one element and the fragment around it.
- The compiled catalogs under `packages/i18n/src/paraglide/` are committed. Regenerate them with `pnpm --filter @kronaut/i18n i18n` after editing the JSON files; never edit them by hand.
- `toast` comes from `@kronaut/ui`, which the `post-page` feature already imports in `published.tsx`. `m` comes from `apps/web/src/base/locale/i18n.ts`. Neither needs a declared feature import.
- Tests go in the existing `post-page.test.tsx`, which renders the whole app, so the app's `Toaster` shows the toasts. No separate test file for the component.
- In tests, stub the clipboard per test with `Object.defineProperty(navigator, 'clipboard', { configurable: true, value })` and restore the original descriptor in `afterEach`. Fire clicks with `fireEvent.click`, as the other web tests do; `user-event` is not installed.
- The toast store in `@kronaut/ui` is module-global and a toast lives 6 seconds, so toasts leak from one test into the next. Clear them in `afterEach` by clicking every toast's "Dismiss" button before `cleanup`; `dismissToast` needs an id the test does not have. No fake timers: the page test relies on real async queries.
- "No error or unhandled rejection is thrown" is proven by the failure toast appearing and by Vitest failing a run on an unhandled rejection; no process-level listener is needed.
- Biome's count for `DestinationRow` against the 60-line function limit was not measured at spec time. The function passes today and gains three lines; the `if_unsure` rule says what to do if the limit fires.
- `pnpm check` does not run the bundle budgets; CI runs `pnpm --filter @kronaut/web size` separately. The three messages land in the main catalogs, which have their own budgets; their current sizes were not measured at spec time.
- The existing assertion that only the https destination gets a "View post" link must keep passing unchanged.
