# Code structure

Where new code goes, and how features depend on each other. [Repo layout](02-repo-layout.md) covers packages; this chapter covers what happens inside them.

Rules marked **checked** fail `pnpm check`, through the tests in `tools/lint/`.

## Feature folders

- **One folder per product concept:** `apps/server/src/<feature>/` and `apps/web/src/<feature>/`. Name the concept first; new behaviour lands in the folder that owns it.
- **New concept, new folder.** The `src/` root holds entrypoints and wiring only.
- **Features stay beside each other:** group by concept (`posts/`, `approvals/`), with no folders by layer such as `controllers/` or `services/`.
- **Route files are wiring.** `routes.ts` binds handlers; shared logic lives in a named module that other features import.
- **A new import from one feature into another is a design decision.** Say why in the PR. The shared module belongs to the concept it describes, not to whichever feature needed it first.
- **Split a folder at about 20 files.** Three files sharing a prefix (`verify-*`, `sniff-*`) are a subfolder waiting to happen.

## Imports

- **No value-import cycle between files (checked).** Type-only imports don't count. When two files need each other, move what they share into a third.
- **Production code never imports testing code (checked).** That covers `*.test.ts`, `testing.ts` and its variants, and `@kronaut/*/testing`. `scripts/` and `apps/server/e2e/` are not shipped, so they may.

## Files and modules

- **Name a file for its concept,** in kebab-case. Catch-all names (`utils`, `helpers`, `common`, `misc`, `types`) hide the owner.
- **Types live with their owner.**
- **A shared module needs two users.** Abstract on the third copy, not the second.
- **Split by step or branch** when a file nears its limit, and pass more than four values as an object. The goal is a clearer owner, not a lower line count.

## Tests

- **Tests sit beside the code they cover.**
- **Write tests where they pay:** the [security](../reference/security-tests.md) and [reliability](../reference/reliability-tests.md) catalogues, DB triggers and RLS, state machines, non-trivial logic. Skip trivial wiring.
- **Test routes over HTTP** through `createTestInstance` (`apps/server/src/http/testing.ts`), so tests cross the same seam as production.
- **Prove a new check can fail.** Break the code once and watch it go red.

## Refactors

- **A refactor keeps every result unchanged.** Pin current behaviour with tests before moving code.
- **Keep existing differences as named policy values** rather than unifying them. Changing a result is a separate, explicit decision.

## Not checked yet

These rules bind new code, but existing code still breaks them:

- Shared modules in the `apps/*/src` roots, which should each find an owner.
- Web tests in the `apps/web/src` root, away from the code they cover.
- `analytics/channel-metrics.ts` and `cli/users.ts` import another feature's `routes.ts`.
- Feature folders import each other in cycles. No new cycle between files is possible, but a new cycle between folders is not caught yet.
- Folders above 20 files: `compose`, `posts`, `publish`, `http`, `media`, `calendar`.
