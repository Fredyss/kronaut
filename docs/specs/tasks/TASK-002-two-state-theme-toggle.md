---
id: TASK-002
prd: PRD-002
title: Make the header theme toggle switch between light and dark only
kind: logic
depends_on: []
touches:
  - apps/web/src/records/theme/theme.tsx
  - apps/web/src/records/theme/theme.test.tsx
  - apps/web/src/pages/settings/account.test.tsx
  - apps/server/e2e/shell.e2e.ts
  - packages/i18n/messages/en.json
  - packages/i18n/messages/sk.json
  - packages/i18n/messages/cs.json
  - packages/i18n/src/paraglide/**
interface:
  - module: apps/web/src/records/theme/theme.tsx
    change: modify
    signature: "export function ThemeToggle(): ReactNode (unchanged signature; two-state behaviour)"
acceptance:
  - 'With window.matchMedia(''(prefers-color-scheme: dark)'') not matching and nothing stored, the header button is named "Theme: light"; a click sets the <html> class to exactly ["dark"], stores "dark" under kronaut.theme and renames the button "Theme: dark"; a second click sets exactly ["light"], stores "light" and renames it "Theme: light".'
  - 'With the media query matching and nothing stored, the button is named "Theme: dark", and one click sets the class to exactly ["light"] and stores "light".'
  - No click on the header button ever removes kronaut.theme or stores "system".
  - 'While the stored choice is system, a "change" event from the media query to matching renames the button "Theme: dark" without a click; while the choice is light, the same event leaves it "Theme: light".'
  - 'When window.matchMedia is undefined and nothing is stored, the button is named "Theme: light".'
  - When localStorage throws, a click still flips the class and the button name.
  - In account.test.tsx, after the Settings select is set to Dark, a click on the header button leaves the select's value "light"; the select still offers system, light and dark.
  - 'In apps/server/e2e/shell.e2e.ts, the cursor test finds the header button by en.theme_light; the theme test, with Playwright''s default light color scheme, starts at "Theme: light", a click gives "Theme: dark" and the html class dark, and a second click gives "Theme: light" and the class light; a second test with page.emulateMedia({ colorScheme: ''dark'' }) before the first navigation starts at "Theme: dark", and one click gives "Theme: light" and the class light; the no-title assertion stays.'
  - theme_system no longer exists in en, sk or cs, no code or test file references it, theme_light and theme_dark are unchanged, and `pnpm check` passes.
if_unsure:
  - Keep every export of theme.tsx and its signature; useTheme still returns the stored choice, including 'system'.
  - Do not export the resolved-theme logic; fallow fails on unused exports.
  - Subscribe to the media query's "change" event inside the store's subscribe function and remove it on unsubscribe; read matches in the snapshot, which must return a primitive.
  - Guard against window.matchMedia being undefined; treat that as not dark.
  - Prefer the smaller change; no new file, no new feature import, no new dependency.
  - If the change would need a protected path or a line in tools/lint/feature-imports.json, stop and report.
out_of_scope:
  - Changing any file outside touches.
  - Changing the Settings Theme select or its theme_option_* messages.
  - Changing styles.css, main.tsx, the storage key or the stored values.
  - Syncing across tabs through the storage event.
  - New icons, animation, aria-pressed or a different button style.
  - Hand-editing files under packages/i18n/src/paraglide.
dependencies_allowed: false
---

# TASK-002: Make the header theme toggle switch between light and dark only

## Context

Delivers the whole of [PRD-002](../PRD-002-two-state-theme-toggle.md). The header button now cycles system → light → dark, and with a dark OS "system" looks the same as dark, so one click seems to do nothing. After this task the button flips between light and dark from whatever is on screen. System stays available only in Settings → Account. This is the only task of the PRD, and it depends on nothing.

## Behaviour

- **Shown theme:** the stored choice if it is `light` or `dark`. When the choice is `system`, it is `dark` when `window.matchMedia('(prefers-color-scheme: dark)').matches`, and `light` otherwise or when `matchMedia` is missing.
- **Render:** the sun icon with `m.theme_light()` as `aria-label` while the shown theme is light. The moon icon with `m.theme_dark()` while it is dark. The monitor branch of `ThemeIcon` goes.
- **Click:** `chooseTheme(shown === 'dark' ? 'light' : 'dark')`.
- **Live OS changes:** while the choice is `system`, the button re-renders when the media query fires `change`.
- **Messages:** remove `theme_system` from `packages/i18n/messages/{en,sk,cs}.json`, then regenerate the compiled catalogs with `pnpm --filter @kronaut/i18n i18n`.

## Notes

- `theme.tsx` keeps a module-level `current` and a listener set behind `useSyncExternalStore`. Extend that store rather than adding a second one: `subscribe` also attaches the media-query listener, and a separate snapshot returns the resolved `'light' | 'dark'` string.
- `current` is module-global, so tests must reset it. Call `chooseTheme('system')` in `afterEach` before `localStorage.clear()`. `account.test.tsx` already does this in its setup.
- Stub `window.matchMedia` per test with `Object.defineProperty(window, 'matchMedia', { configurable: true, value })`. The fake returns `{ matches, addEventListener, removeEventListener }` and keeps the listener, so the test can fire `change` inside `act`. Restore the original descriptor in `afterEach`.
- The existing first test in `theme.test.tsx`, which asserts the three-step cycle, is replaced by the two-state cases. The storage-throws test keeps its intent, with the new names.
- `account.test.tsx` lines 116–124 change only in the last assertion, from `'system'` to `'light'`.
- `apps/server/e2e/shell.e2e.ts` imports `en.theme_system` in both tests. It is type-checked by `tsc -b`, so removing the message without changing it fails `pnpm check`. Its theme test asserts the old three-step cycle and gets rewritten for the two states. The suite runs with `pnpm test:e2e` (host gates: Docker and Chromium). Playwright's default color scheme is light, and the config sets none.
- `theme.tsx` has 109 lines; the change keeps it well under 300.
