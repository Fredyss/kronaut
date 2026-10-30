# Code structure

Where new code goes, and how features depend on each other. [Repo layout](02-repo-layout.md) covers packages; this chapter covers what happens inside them.

Rules marked **checked** fail `pnpm check`, through the tests in `tools/lint/`.

## Feature folders

- **One folder per product concept:** `apps/server/src/<feature>/` and `apps/web/src/<feature>/`. Name the concept first; new behaviour lands in the folder that owns it.
- **New concept, new folder.** The `src/` root holds entrypoints and wiring only.
- **Features stay beside each other:** group by concept (`posts/`, `approvals/`), with no folders by layer such as `controllers/` or `services/`.
- **Route files are wiring (checked).** `routes.ts` binds handlers; shared logic lives in a named module that other features import.
- **A new import from one feature into another is a design decision.** Say why in the PR. The shared module belongs to the concept it describes, not to whichever feature needed it first.
- **About 20 non-test files is a prompt to review a folder.** Split it when it holds distinct sub-concepts, not to reach a count. Three files sharing a prefix (`verify-*`, `sniff-*`) are a subfolder waiting to happen.

## Imports

- **No value-import cycle between files (checked).** Lazy imports and imports through a `@kronaut/*` package count; type-only imports don't. When two files need each other, move what they share into a third.
- **Production code never imports testing code (checked).** That covers `*.test.ts`, `testing.ts` and its variants, and `@kronaut/*/testing`. `packages/db/scripts/` and `apps/server/e2e/` stay out of the image, so they may.
- **Imports between features are declared (checked).** [`tools/lint/feature-imports.json`](../../tools/lint/feature-imports.json) lists each one as source feature and exact target file, so a feature reaches another feature's files only through listed targets.
  - It covers production value imports, including features importing the wiring folders (`server/http`, `web/i18n`, `web/routes`).
  - Type-only imports, tests, imports made by wiring folders and `apps/*/src` root files are outside it, so a root file, or a wiring file the feature already lists, can still pass one feature's code to another.
  - A new line is a design decision: add it by hand in the PR that needs it, and say why. Prefer a target already listed, or a file that clearly owns the concept.
  - A line covers the whole source feature, so a second file there can use a listed target without a new line.
  - Once no file in the source feature imports a target, the check fails until its line goes too, so the list only ever shows what exists.
  - The list records today's coupling; it doesn't approve it. Each feature split should make it shorter.

## Files and modules

- **Name a file for its concept,** in kebab-case. Catch-all names (`utils`, `helpers`, `common`, `misc`, `types`) hide the owner.
- **Types live with their owner.**
- **Code stays with its only user.** A module becomes shared once a second module imports it. Repeated logic gets abstracted on the third copy, not the second.
- **Split by step or branch** when a file nears the Biome limit of 300 lines (500 for tests), and pass more than four values as an object. The goal is a clearer owner, not a lower line count.

## Tests

- **Tests sit beside the code they cover.**
- **Write tests where they pay:** the [security](../reference/security-tests.md) and [reliability](../reference/reliability-tests.md) catalogues, DB triggers and RLS, state machines, non-trivial logic. Skip trivial wiring.
- **Test routes over HTTP** through `createTestInstance` (`apps/server/src/http/testing.ts`), so tests cross the same seam as production.
- **Prove a new check can fail.** Break the code once and watch it go red.

## Refactors

- **A refactor keeps every result unchanged:** status codes, error shapes, ordering, defaults, permissions, side effects and transaction boundaries. Pin current behaviour with tests before moving code.
- **Keep existing differences as named policy values** rather than unifying them. Changing a result is a separate, explicit decision.

## Not checked yet

These rules bind new code, but existing code still breaks them:

- Shared modules in the `apps/*/src` roots, which should each find an owner.
- Web tests in the `apps/web/src` root, away from the code they cover.
- `calendar/sidebar.tsx`, `compose/channel-picker.tsx` and `post-actions/compose-dialog.tsx` import a file from `web/routes`.
- `apps/server/src/http/types.ts` has a catch-all name.
- Feature folders import each other in cycles. A cycle between files fails the check; between folders, the declared list only makes a new one visible in review.
- Feature folders above 20 non-test files, not reviewed yet: `compose`, `posts`, `publish`, `http`, `media`, `calendar`.
- New post, edit from the post page and duplicate open the full-page composer, not a dialog.
