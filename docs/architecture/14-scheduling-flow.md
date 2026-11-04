# Scheduling flow

Which way imports run between the server folders that carry a post from draft to published, and the moves that get there. Read it before adding a planning tool or moving code in `posts`, `queue`, `series`, `approvals`, `approval-policy` or `publish`.

**Status:** done. All five PRs below are done, and `pnpm check` keeps the server folders free of loops. The problem section is as measured at `e58af2a`. [Code structure](13-code-structure.md) holds the general rules; this chapter applies them to one flow.

## The flow

```text
draft ──> pick a time ──> freeze ──> approval ──> scheduled ──> publish ──> analytics
           (queue)        (posts)   (approvals)                 (publish)
                             ^
                             └── series and evergreen re-enter here, acting as the post's owner,
                                 through scheduleOrRequest in posts/owner/owner-schedule.ts
```

## The problem

Files have no import cycle, but folders do. Measured at `e58af2a`, before PR 1, 11 of them formed one loop. Most links carry no scheduling logic:

- **Generic helpers live in `posts`.** `pathId`, `unprocessable`, `iso` and `zodDetails` tie `notifications`, `analytics` and `system` to `posts`, and `system` brings in `auth` and `channels`.
- **Row access is split.** `lockPost` is in `publish`, `lockCurrent` and `postUnits` are in `posts`, and every feature needs them.
- **Two folders have two halves.** `series` and `approvals` each hold rules that scheduling consults and flows that call scheduling (`queue` imports `posts` only for row access and the time helpers, both covered below):
  - `series/start.ts` sits below `posts/schedule.ts`; `series/step.ts` sits above it.
  - `approvals/binding.ts` sits below it; `approvals/request.ts` is its twin.
- **`freeze.ts` also holds the time helpers.** `queue`, `series` and `evergreen` import it only for `resolveLocal` or `Schedule`.
- **`publish/finalize.ts` re-exports `transition`,** so a state change looks like a dependency on the worker.

## Direction

Each tier imports only tiers below it. Folders in one tier don't import each other (checked by [`tools/lint/tier-order.ts`](../../tools/lint/tier-order.ts) on production value imports; a `src` root file counts as above tier 1). Each feature folder sits in the folder of its tier, as `apps/server/src/<tier folder>/<feature>/`, so the tree shows the direction. A new feature goes into its tier folder; a new tier goes into this table and [`tools/lint/folders.ts`](../../tools/lint/folders.ts) in the same PR.

| Tier | Tier folder | Features | Owns |
|---|---|---|---|
| 1. Actors | `actors/` | `series`, `evergreen`, `post-import`, `destinations`, `media`, `meta`, `cli`, `system` | Whatever drives or reads posts from outside the editing flow |
| 2. Flow | `flow/` | `posts` | Drafts, edits, freeze, scheduling, opening an approval request, starting a series |
| 3. Steps | `steps/` | `approvals`, `queue`, `tags`, `saved-texts`, `publish` | One step each: decisions and bindings, free slots, labels, reusable text, the destination state machine and worker |
| 4. Records | `records/` | `analytics`, `notifications`, `media-imports`, `short-links` | What the steps record, the link imports that media and RSS autopost start, and the short links the publish worker swaps in |
| 5. Policy | `policy/` | `approval-policy` | The approval rules that scheduling, decisions, the claim and notifications read |
| 6. Access | `access/` | `post-access`, `audit`, `channels` | Locks, versions, scope units, list reads, audit rows, channel lookups |
| 7. Identity and events | `identity/` | `auth`, `webhooks` | Sessions and webhook events |
| 8. Infrastructure | `infrastructure/` | `jobs`, `credentials`, `quota` | Job queue and locks, cron task names, credential storage, rate windows |
| Base | `base/` | `http`, `config`, `crypto`, `providers`, plus `@kronaut/core` | Request helpers, configuration, purpose keys and token hashing, the provider registry, pure domain and time |

`http` is base only: every tier imports its helpers, and it imports no feature. `api-routes.ts`, which mounts the features, sits in the `src` root, and auth's sign-in step (`auth/authenticate.ts`, `auth/session-guard.ts`) is passed in by the wiring through `HttpDeps`. Before that, `http` was base and wiring at once, so the loop counts for PRs 1 to 4 below cover production value imports between feature folders only: type-only imports, tests, `http` as an importer and the `src` root files stay out, as they do in `feature-imports.json`. The check from PR 5 keeps each `src` root file as its own node instead, so a loop through one of them fails too. Measured that way, `main` before PR 5 still had only `auth` and `system`.

`publish` already never imports `posts`. That stays: the worker knows destinations, not the editing flow.

## Where new code goes

- **It creates or schedules posts** (CSV import, RSS autopost): a new folder in `actors/`, tier 1. One that acts within a member's request, like `post-import`, calls `scheduleLocked` or `openApprovalRequest` as that member. One that acts later on its own, like `evergreen`, schedules as the owner through `posts/owner/owner-schedule.ts`.
- **Scheduling consults it** (a new rule on times or content): a module in tier 3 or 5 with no import of `posts`, which `posts/schedule/` calls.
- **It reshapes a draft** (signatures, templates): `posts/draft/`, or its own folder below `posts` if it needs its own routes and tables.
- **It reads or locks a post for another feature:** `post-access`.

Every time and approval decision keeps going through `scheduleLocked` or `openApprovalRequest`, so a new entry point inherits freeze, binding and the audit trail. An owner acting on its own, such as a series step or an evergreen copy, goes through `posts/owner/owner-schedule.ts`:
- `needsRequest` comes first. It says yes when the policy asks for approval or an agent wrote the content (`agent_dirty`), and the owner then opens a request with `requestAsOwner`.
- Otherwise `scheduleOrRequest` schedules, and falls back to a request when scheduling still needs approval.
- `scheduleOrRequest` alone skips the agent check. Only a post whose newest request is already approved goes straight to it.

## Moves

One PR each, in this order. Each keeps every result unchanged, and the route snapshot and OpenAPI output stay identical. The last column is measured on the import graph at `e58af2a`, by value import and symbol.

| PR | Moves | Folder loops left |
|---|---|---|
| Today | | 11 folders |
| 1. Helpers | `params.ts`, `unprocessable`, `iso`, `plainLocal`, `invalid`, `InstantFields` to `http`, and `zodDetails` replaced by `issueDetails` there. `Resolving` stays in `posts`, in `deps.ts`. `resolveLocal`, `scheduleAt`, `Schedule`, `TzResolution` to `@kronaut/core`. `posts/audit.ts` to `audit/`. | 8 folders, plus `auth` and `system` |
| 2. Access | `publish/lock.ts`, `posts/locks.ts`, `posts/units.ts`, `excerptOf`, `visibleIn`, `loadMains` to `post-access/`. Imports of `transition` point at `publish/transition.ts`, and the re-export goes. | 5 folders, plus `auth` and `system` |
| 3. Flow | `approvals/request.ts`, `series/start.ts`, `series/repeat.ts` to `posts/`, as `approval-request.ts`, `series-start.ts` and `repeat.ts`. `approvalRequestRoutes` is mounted from `posts` and `approvals/routes.ts` stops mounting it; otherwise `approvals` still imports `posts` and the loop stays. `APPROVAL_UNBOUND` to `approvals/binding.ts`. | `approvals` and `notifications`, plus `auth` and `system` |
| 4. Policy | `approvals/policy.ts`, `policy-store.ts`, `policy-routes.ts` to `approval-policy/`, with `policyRoutes` mounted in `http/api-routes.ts`, because a feature can't import another feature's route file. It sits beside `approvals`, not inside it: `approvals` still imports `notifications`, so a subfolder would keep the loop. | `auth` and `system` |
| 5. Check | `system/instance-admins.ts` to `auth/`, then a check in `tools/lint/structure.test.ts` that server feature folders have no cycle. It keeps each `http` and `src` root file as its own node, so `api-routes.ts` mounting every feature isn't a loop, but a loop through `caller/authenticate.ts` or `cron.ts` is. | None, and `pnpm check` keeps it so |

The PR rows describe the code as it was then: since the server root PR, `http` is one base folder, `api-routes.ts` sits in the `src` root and the sign-in step lives in `auth/`.

After PR 2 the folder loops measured 5 folders, `approvals`, `notifications`, `posts`, `publish` and `series`, plus `auth` and `system`. After PR 3 they measured `approvals` and `notifications`, plus `auth` and `system`. After PR 4 only `auth` and `system` were left, and after PR 5 there are none.

`feature-imports.json` changes in each PR. Its length isn't the measure here, because moves into `post-access` and `audit` trade one line for another.

## What stays

- **Lock order:** the post comes first, then its destinations or approval request. Moving a function doesn't change the order it locks in.
- **`transition` stays in `publish`.** It writes notifications, and `notifications` reads through `post-access`, so moving it down would rebuild the loop.
- **`approvalStatus` stays in `publish/principal.ts`,** because the claim re-checks it.
- **`posts` stays one folder with sub-domains.** It reached 30 source files after PR 3, over the 25-file limit in [Code structure](13-code-structure.md), so it was split by sub-domain: `draft/`, `read/`, `schedule/` (time, freeze, approval request, series start) and `owner/` (the seam for series and evergreen), with `routes.ts`, `deps.ts` and `testing.ts` left in the root.

## Rejected

- **A new `scheduling` folder for the flow:** it moves far more files, and `posts` would be left holding little beyond CRUD. A subfolder of `posts` can get there later.
- **Events or injected callbacks between folders:** a dependency hidden at runtime is harder to follow, and there's no outbox for it ([Stack](01-stack.md)).
- **Barrels per feature:** a simulation gives a cycle across 129 of 241 server files.
- **Keeping only the file-level check:** folders would keep mixing rules and flows, so new tools would have no clear home.

## Out of scope

The web folders have their own chapter, [Web structure](15-web-structure.md). Measured after the web root moved into owner folders, their loop spanned 8 folders: `approvals`, `calendar`, `channels`, `compose`, `inbox`, `notifications`, `post-actions` and `saved-texts`.
