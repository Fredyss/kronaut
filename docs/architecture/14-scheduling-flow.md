# Scheduling flow

Which way imports run between the server folders that carry a post from draft to published, and the moves that get there. Read it before adding a planning tool or moving code in `posts`, `queue`, `series`, `approvals` or `publish`.

**Status:** target. The moves below are not done yet. [Code structure](13-code-structure.md) holds the general rules; this chapter applies them to one flow.

## The flow

```text
draft ──> pick a time ──> freeze ──> approval ──> scheduled ──> publish ──> analytics
           (queue)        (posts)   (approvals)                 (publish)
             ^
             └── series and evergreen re-enter here, acting as the post's owner
```

## The problem

Files have no import cycle, but folders do: 11 of them form one loop. Most links carry no scheduling logic:

- **Generic helpers live in `posts`.** `pathId`, `unprocessable`, `iso` and `zodDetails` tie `notifications`, `analytics` and `system` to `posts`, and `system` brings in `auth` and `channels`.
- **Row access is split.** `lockPost` is in `publish`, `lockCurrent` and `postUnits` are in `posts`, and every feature needs them.
- **Three folders have two halves.** `queue`, `series` and `approvals` each hold rules that scheduling consults and flows that call scheduling:
  - `series/start.ts` sits below `posts/schedule.ts`; `series/step.ts` sits above it.
  - `approvals/binding.ts` sits below it; `approvals/request.ts` is its twin.
- **`freeze.ts` also holds the time helpers.** `queue`, `series` and `evergreen` import it only for `resolveLocal` or `Schedule`.
- **`publish/finalize.ts` re-exports `transition`,** so a state change looks like a dependency on the worker.

## Direction

Each tier imports only tiers below it. Folders in one tier don't import each other.

| Tier | Folders | Owns |
|---|---|---|
| 1. Actors | `series`, `evergreen`, `destinations`, `media`, `meta`, `cli`, `system` | Whatever drives or reads posts from outside the editing flow |
| 2. Flow | `posts` | Drafts, edits, freeze, scheduling, opening an approval request, starting a series |
| 3. Steps | `approvals`, `queue`, `tags`, `publish` | One step each: decisions and bindings, free slots, labels, the destination state machine and worker |
| 4. Records | `analytics`, `notifications` | What the steps record |
| 5. Policy | `approval-policy` | The approval rules that scheduling, the claim and notifications read |
| 6. Access | `post-access`, `audit`, `channels` | Locks, versions, scope units, list reads, audit rows, channel lookups |
| 7. Identity and events | `auth`, `webhooks` | Sessions and webhook events |
| Base | `http`, `@kronaut/core` | Request helpers, pure domain and time |

`http` is base and wiring at once. Every tier imports its helpers, but its wiring files import upward: `api-routes.ts` mounts the features, and `authenticate.ts` and `session-guard.ts` read `auth`. So the rule above and the loop counts below cover production value imports between feature folders only: type-only imports, tests, `http` as an importer and the `src` root files stay out, as they do in `feature-imports.json`.

`publish` already never imports `posts`. That stays: the worker knows destinations, not the editing flow.

## Where new code goes

- **It creates or schedules posts** (CSV import, RSS autopost): a new tier 1 folder that calls `scheduleOrRequest` as the owner, like `evergreen`.
- **Scheduling consults it** (a new rule on times or content): a module in tier 3 or 5 with no import of `posts`, which `posts` calls.
- **It reshapes a draft** (signatures, templates): `posts`, or its own folder below `posts` if it needs its own routes and tables.
- **It reads or locks a post for another feature:** `post-access`.

Every time and approval decision keeps going through `scheduleLocked` or `openApprovalRequest`, so a new entry point inherits freeze, binding and the audit trail.

## Moves

One PR each, in this order. Each keeps every result unchanged, and the route snapshot and OpenAPI output stay identical. The last column is measured on the import graph at `e58af2a`, by value import and symbol.

| PR | Moves | Folder loops left |
|---|---|---|
| Today | | 11 folders |
| 1. Helpers | `params.ts`, `issues.ts`, `iso`, `plainLocal`, `invalid`, `zodDetails`, `InstantFields` to `http`. `resolveLocal`, `scheduleAt`, `Schedule`, `TzResolution` to `@kronaut/core`. `posts/audit.ts` to `audit/`. | 8 folders, plus `auth` and `system` |
| 2. Access | `publish/lock.ts`, `posts/locks.ts`, `posts/units.ts`, `excerptOf`, `visibleIn`, `loadMains` to `post-access/`. Imports of `transition` point at `publish/transition.ts`, and the re-export goes. | 5 folders, plus `auth` and `system` |
| 3. Flow | `approvals/request.ts`, `series/start.ts`, `series/repeat.ts` to `posts/`, with `requestRoutes` mounted there. `APPROVAL_UNBOUND` to `approvals/binding.ts`. | `approvals` and `notifications`, plus `auth` and `system` |
| 4. Policy | `approvals/policy.ts`, `policy-store.ts`, `policy-routes.ts` to `approval-policy/`, with `policyRoutes` mounted in `http/api-routes.ts`, because a feature can't import another feature's route file. | `auth` and `system` |
| 5. Check | `system/instance-admins.ts` to `auth/`, then a check in `tools/lint/structure.test.ts` that server feature folders have no cycle, built on the `server/` lines of `featureImports` so `http` stays out as an importer. | None, and `pnpm check` keeps it so |

`feature-imports.json` changes in each PR. Its length isn't the measure here, because moves into `post-access` and `audit` trade one line for another.

## What stays

- **Lock order:** the post comes first, then its destinations or approval request. Moving a function doesn't change the order it locks in.
- **`transition` stays in `publish`.** It writes notifications, and `notifications` reads through `post-access`, so moving it down would rebuild the loop.
- **`approvalStatus` stays in `publish/principal.ts`,** because the claim re-checks it.
- **`posts` stays large.** It goes from 30 non-test files to 28 by PR 3. Its split into subfolders comes after PR 5, when the check is in.

## Rejected

- **A new `scheduling` folder for the flow:** it moves far more files, and `posts` would be left holding little beyond CRUD. A subfolder of `posts` can get there later.
- **Events or injected callbacks between folders:** a dependency hidden at runtime is harder to follow, and there's no outbox for it ([Stack](01-stack.md)).
- **Barrels per feature:** a simulation gives a cycle across 129 of 241 server files.
- **Keeping only the file-level check:** folders would keep mixing rules and flows, so new tools would have no clear home.

## Out of scope

The web knot `compose`, `approvals`, `channels`, `post-actions` needs its own look.
