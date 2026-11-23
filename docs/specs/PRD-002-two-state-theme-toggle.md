# PRD-002: Two-state theme toggle in the header

Status: draft
Owner: Frederik Schlentc
Date: 2026-11-23

## Goal

The theme button in the header cycles through three states: system, light and dark. When the operating system is in dark mode, "system" and "dark" look the same, so one of the three clicks seems to do nothing and the button feels broken. After this change, the header button has two states, light and dark. Every click visibly flips the page. Following the operating system stays possible, but only through the Theme select in Settings → Account.

## Scope

**In:**

- The header `ThemeToggle` in `apps/web/src/records/theme/theme.tsx` flips between light and dark, starting from the theme that is on screen.
- While the stored choice is "system", the button shows the theme the operating system currently gives, and it updates when the operating system switches.
- The monitor icon and the `theme_system` message are removed, because nothing uses them anymore.

**Out (non-goals):**

- The Settings → Account Theme select. It keeps System, Light and Dark and works as it does today.
- Any change to `styles.css`, `main.tsx`, the storage key `kronaut.theme` or the stored values.
- Syncing the theme across browser tabs.
- Storing the theme on the server or per user.
- New icons, animation or a new button style.
- Any server, contract, SDK or database change.

## Behaviour

### Normal path

- The **shown theme** is the stored choice when that is `light` or `dark`. When the choice is `system`, it is `dark` if `matchMedia('(prefers-color-scheme: dark)')` matches and `light` otherwise.
- The button shows the sun icon and the accessible name "Theme: light" while the shown theme is light. It shows the moon icon and "Theme: dark" while the shown theme is dark.
- A click calls `chooseTheme` with the opposite of the shown theme. That stores `light` or `dark` and sets the class on `<html>` as it does today.
- A click never stores `system`. The only way back to following the operating system is the Settings select.

### Edge cases

| Case | Expected result |
| --- | --- |
| First visit, OS light, nothing stored | Sun, "Theme: light". A click goes to dark and stores `dark` |
| First visit, OS dark, nothing stored | Moon, "Theme: dark". A click goes to light and stores `light` |
| Choice is `system` and the OS switches while the page is open | The icon and name follow the OS without a reload |
| Choice is `light` or `dark` and the OS switches | Nothing changes |
| `window.matchMedia` is missing | The shown theme for `system` is light, which matches what the CSS shows without the media query |
| `localStorage` throws | The toggle still flips the page; the choice is kept in memory for the session, as today |
| The Settings select changes the theme | The header button updates at once, because both use the same store |
| The Settings select is set back to System | The header button shows the OS theme again |
| Rapid repeated clicks | Each click flips once. No debounce |
| Another tab changes the theme | Not synced; out of scope, as today |

### Errors

None. The toggle makes no request and catches storage failures as today.

## Data

None. The storage key and its values (`light`, `dark`, or absent for system) are unchanged.

## Interfaces

- No export is added or removed in `apps/web/src/records/theme/theme.tsx`. `THEMES`, `Theme`, `storedTheme`, `applyTheme`, `chooseTheme`, `useTheme` and `ThemeToggle` keep their signatures. `useTheme` keeps returning the stored choice, including `system`, because the Settings select needs it.
- The resolved theme is computed inside `theme.tsx` and is not exported.

## UI

- **Element:** the existing ghost icon button. Only the icon and the label logic change.
- **Icons:** the sun and moon paths already in `ThemeIcon`. The monitor branch is removed.
- **Copy:** `theme_light` and `theme_dark` stay as they are. `theme_system` is removed from `packages/i18n/messages/{en,sk,cs}.json`, and the compiled catalogs are regenerated with `pnpm --filter @kronaut/i18n i18n`. The Settings messages `theme_option_*` are not touched.

## Permissions and security

None. This is a client-only display preference with no new input.

## Limits

None.

## Rollout

No flag. Stored values are unchanged, so existing users keep their choice. Users on `system` see the same page as before; their first click now flips the page instead of going to "light" first.

## Testing

In `apps/web/src/records/theme/theme.test.tsx`, with `window.matchMedia` stubbed per test:

1. OS light, nothing stored: "Theme: light"; click → `<html>` class `dark`, stored `dark`, "Theme: dark"; click → class `light`, stored `light`, "Theme: light".
2. OS dark, nothing stored: "Theme: dark"; one click → class `light`, stored `light`.
3. Choice `system`: a change event from the media query to dark updates the button to "Theme: dark" without a click. With choice `light`, the same event changes nothing.
4. `window.matchMedia` undefined: "Theme: light".
5. Storage throws: the toggle still flips (the existing test, updated).

In `apps/web/src/pages/settings/account.test.tsx`, the existing shared-store test changes its last step: after the select is set to Dark, a header click leaves the select on Light.

In `apps/server/e2e/shell.e2e.ts`, which uses `theme_system` today, the cursor test finds the button by `theme_light`. The theme test covers both color schemes in a real browser: light starts at "Theme: light" and flips twice, and dark (via `page.emulateMedia`) starts at "Theme: dark" and flips to light in one click.

Cases 1 and 2 matter most. `pnpm check` and `pnpm test:e2e` must pass.

## Technology

None. `matchMedia` is a browser API; no dependency is added.

## Defaults for the unforeseen

- Keep every export's signature; change only the toggle's internals.
- Prefer the smaller change: no new file, no new feature import, no new dependency.
- If the change would need a protected path or a line in `tools/lint/feature-imports.json`, stop and report.

## Decisions

| Decision | Reason |
| --- | --- |
| The header button has two states; System stays only in Settings | Every header click visibly changes the page, and users who want the OS to decide still can (owner's choice) |
| The icon shows the current theme: sun in light, moon in dark | The same convention as today's button, so only the monitor icon goes (owner's choice) |
| The first click flips from the shown theme, not from the stored value | With a dark OS and choice `system`, going to "dark" first would repeat the bug |
| A header click always stores an explicit value | A toggle that sometimes returns to "system" would bring the invisible state back |
| The button follows OS changes live while the choice is `system` | Otherwise the icon could show "light" on a dark page after the OS switches |
| `useTheme` keeps returning the stored choice | The Settings select needs to show System |
| `theme_system` is removed | Nothing would use it anymore once `shell.e2e.ts` moves to `theme_light` |

## Open questions

None.
