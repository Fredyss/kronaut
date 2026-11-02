# Code structure

Where new code goes, and how features depend on each other. [Repo layout](02-repo-layout.md) covers packages; this chapter covers what happens inside them.

Rules marked **checked** fail `pnpm check`, through the tests in `tools/lint/`.

## Where code goes

Use this table before you create a file or move one.

| Situation | Where it goes | Rule |
|---|---|---|
| A new concept | A new feature folder: `apps/<app>/src/<feature>/` | [Feature folders](#feature-folders) |
| A sub-concept of a feature | A subfolder named for the sub-domain, inside that feature | [Feature folders](#feature-folders) |
| A module a second feature needs | Logic stays with its owner, and the importing feature declares the import. A UI component moves to a shared home instead | [Imports](#imports), [Shared UI](#shared-ui) |
| A styled UI primitive with no translated text | `packages/ui` | [Shared UI](#shared-ui) |
| A UI piece used app-wide that shows translated text or reads app state | `apps/web/src/ui/` | [Shared UI](#shared-ui) |
| Shell, navigation, layout | `apps/web/src/shell/`; router wiring and global context providers in `app.tsx` and `routes/` | [Shared UI](#shared-ui) |
| A request helper | Server: `apps/server/src/http/`. Web: `apps/web/src/api/` | [Imports](#imports) |
| A pure domain or time rule | `@kronaut/core` | [Repo layout](02-repo-layout.md) |
| Code more than one app or package uses | A package under `packages/` | [Repo layout](02-repo-layout.md) |

**Default:** keep code close to the feature that owns it. Move it only for a clear reuse, ownership or architectural reason. Repeated logic gets a shared abstraction on the third copy, not the second.

## Feature folders

- **One folder per product concept:** `apps/server/src/<feature>/` and `apps/web/src/<feature>/`. Name the concept first; new behaviour lands in the folder that owns it.
- **New concept, new folder.** The `src/` root holds entrypoints and wiring only. In the web app this is checked: the root holds only `main.tsx` and `app.tsx`.
- **Features stay beside each other:** group by concept (`posts/`, `approvals/`), with no folders by layer such as `controllers/` or `services/`.
- **Route files are wiring.** `routes.ts` and `*-routes.ts` bind handlers; shared logic lives in a named module that other features import. A feature importing another feature's file with one of those names fails the check; the check goes by file name only.
- **A new import from one feature into another is a design decision.** Say why in the PR. The shared module belongs to the concept it describes, not to whichever feature needed it first.
- **Planning tools and the server folders from draft to publish follow one direction:** [Scheduling flow](14-scheduling-flow.md) sets it and says where new code goes.
- **Subfolders are sub-domains, never layers.** Name them after a part of the concept (`compose/media/`, `publish/verify/`, `media/import/`), not after a kind of file (`components/`, `hooks/`, `services/`, `utils/`). Tests stay beside their code. Files in one feature import across its subfolders freely; the file-cycle check still applies, and other features import a subfolder file through a declared line as usual.
- **At most 25 source files per directory** (checked once the splits below land). Every directory under `apps/*/src` and `packages/*/src` counts, `src` roots included, and only files directly inside it: files in its subfolders count for their own directory. Tests (`*.test.*`, `*.spec.*`) and generated files (`paraglide*/`, `gen/`, `*.gen.ts`, `*.d.ts`) don't count; `index.ts` does. No directory is exempt.
  - The limit is a guardrail, not a target. Past it, regroup the folder around sub-concepts. Don't nest just to pass the check.
  - Three files sharing a prefix (`verify-*`, `sniff-*`) are a subfolder waiting to happen.

## Imports

- **No value-import cycle between files (checked).** Lazy imports and imports through a `@kronaut/*` package count; type-only imports don't. When two files need each other, move what they share into a third.
- **Production code never imports testing code (checked).** That covers `*.test.ts`, testing helpers, and `@kronaut/*/testing`. `packages/db/scripts/` and `apps/server/e2e/` stay out of the image, so they may.
- **Imports between features are declared (checked).** [`tools/lint/feature-imports.json`](../../tools/lint/feature-imports.json) lists each one as source feature and exact target file, so a feature reaches another feature's files only through listed targets.
  - It covers production value imports, including features importing the wiring folders (`server/http`, `web/i18n`, `web/routes`).
  - Type-only imports, tests, imports made by wiring folders and `apps/*/src` root files are outside it, so a root file, or a wiring file the feature already lists, can still pass one feature's code to another.
  - A new line is a design decision: add it by hand in the PR that needs it, and say why. Prefer a target already listed, or a file that clearly owns the concept.
  - A line covers the whole source feature, so a second file there can use a listed target without a new line.
  - Once no file in the source feature imports a target, the check fails until its line goes too, so the list only ever shows what exists.
  - The list records today's coupling; it doesn't approve it. Each feature split should make it shorter.
- **Base folders are shared layers (checked).** `web/api` (client, errors, idempotency, the signed-in user), `web/locale` (messages, formatting, locale choice) and `web/ui` (app-wide UI pieces) may be imported by any web feature without a declared line. A base folder value-imports only packages, its own files and other base folders: no feature and no `src` root file. As with declared imports, type-only imports are outside the check. A new base folder is a design decision, like a declared import.
  - The server gets one base folder too: the request helpers in `http`, once its wiring files (`api-routes.ts`, `authenticate.ts`, `session-guard.ts`) move out. Until then, imports of `http` stay declared, and the server follows the tiers in [Scheduling flow](14-scheduling-flow.md).
- **Only named folders read credentials (checked).** `@kronaut/credentials` (keyrings, sealing) is value-imported only by `server/credentials`, `server/cli` and the entrypoints `start.ts` and `openapi.ts`. The stores in `apps/server/src/credentials/`, which hand out plaintext tokens and app secrets, are value-imported only by `publish` (the worker), `channels` (connect, revoke, instance apps), `analytics` (insights), `meta` (signed callbacks) and `cli` (operator commands). Type-only imports, such as `Keyring` in deps, are free. Tests and `apps/server/e2e/` are outside it too. The check sees direct imports only, so a reader folder never hands credentials on to another feature, by re-export or by wrapper; that part is for review. A new reader is a security decision: add it to the sets in `tools/lint/structure.ts` and to this list in the same PR.

## Shared UI

- **Three homes, each with one job:**
  - **`packages/ui`:** styled primitives with no translated text and no app state, such as button, input, select, switch, dialog, menu, card and badge. One component per kebab-case file in a flat `src/`, exported from `index.ts`.
  - **`apps/web/src/ui/`** (base folder): pieces used app-wide that show translated text or read app state, such as the count badge.
  - **`apps/web/src/shell/`:** the app chrome: rail, navigation and page layout. It's an ordinary feature folder, so other features import it through declared lines. Router wiring stays in `app.tsx` and `routes/`.
  - Not to be confused with `apps/web/src/providers/`, which holds UI for social platform providers.
- **A component stays in its feature until a second feature needs it.** Then it moves: to `packages/ui` if it's a pure primitive, to `web/ui` if it needs messages or state. It doesn't go behind a declared import from another feature.
- **Don't copy primitive styling.** This is the one exception to the third-copy rule: a class string repeated once for a select or a dialog is already a missing `packages/ui` component.

## Files and modules

- **Name a file for its concept,** in kebab-case. Catch-all names (`utils`, `helpers`, `common`, `misc`, `types`) hide the owner.
- **Types live with their owner.**
- **Code stays with its only user.** A module becomes shared once a second module imports it. Repeated logic gets abstracted on the third copy, not the second.
- **Split by step or branch** when a file nears the Biome limit of 300 lines (500 for tests), and pass more than four values as an object. The goal is a clearer owner, not a lower line count.

## Tests

- **Tests sit beside the code they cover.** A test in an `apps/*/src` root needs a file of the same name there (checked); elsewhere this is for review.
- **Testing helpers have one name (checked):** `testing.ts` or `testing.tsx`, or files in a `testing/` folder when a feature needs several.
- **Write tests where they pay:** the [security](../reference/security-tests.md) and [reliability](../reference/reliability-tests.md) catalogues, DB triggers and RLS, state machines, non-trivial logic. Skip trivial wiring.
- **Test routes over HTTP** through `createTestInstance` (`apps/server/src/http/testing.ts`), so tests cross the same seam as production.
- **Prove a new check can fail.** Break the code once and watch it go red.

## Refactors

- **A refactor keeps every result unchanged:** status codes, error shapes, ordering, defaults, permissions, side effects and transaction boundaries. Pin current behaviour with tests before moving code.
- **Keep existing differences as named policy values** rather than unifying them. Changing a result is a separate, explicit decision.

## Not checked yet

These rules bind new code, but existing code still breaks them:

- Shared modules in the `apps/server/src` root, which should each find an owner.
- `post-actions/compose-dialog.tsx` imports a file from `web/routes`.
- `apps/server/src/http/types.ts` has a catch-all name.
- Modules other features import that also define routes: `posts/schedule.ts`, `channels/disconnect.ts`, `auth/profile.ts`.
- Feature folders import each other in cycles. A cycle between files fails the check; between folders, the declared list only makes a new one visible in review. [Scheduling flow](14-scheduling-flow.md) plans the server fix. The web loop spans 8 folders (`approvals`, `calendar`, `channels`, `compose`, `inbox`, `notifications`, `post-actions`, `saved-texts`); a web chapter will set its direction.
- Directories above 25 source files: `web/compose` (51), `server/media` (31), `server/posts` (30), `server/http` (29), `server/publish` (26). Each gets its own split; the check lands with the last one.
- Shared UI outside its home: `settings/card.tsx` is a primitive used by `system`, `approvals` and `routes`; `settings/switch.tsx` is used by `routes`; `approvals/password-dialog.tsx` is used by `channels` and `media`; the select styling is a `SELECT` class string in `locale/select.tsx`, used by 7 other files, plus an inline copy in `approvals/policy-form.tsx`. `post-actions/modal.tsx` is a primitive too, though only `post-actions` uses it so far.
