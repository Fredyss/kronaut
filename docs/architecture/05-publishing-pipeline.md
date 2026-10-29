# Publishing pipeline

**Rule: jobs only wake work up. The `post_destinations` row is the source of truth.**

## States (ADR-0007): 11 states, 37 transitions, enforced by `trg_dest_guard`

| From | To |
|---|---|
| draft | scheduled, canceled |
| scheduled | draft, publishing, awaiting_manual, blocked, failed, canceled |
| retry_wait | draft, publishing, blocked, failed, canceled |
| publishing | published, retry_wait, verifying, unconfirmed, failed, blocked, canceled (only if no `public_send_at`) |
| verifying | published, retry_wait, unconfirmed, failed |
| unconfirmed | published (verified/manual), scheduled ("send again", with an explicit duplicate acknowledgement), canceled. **Never back to publishing** |
| blocked | scheduled, draft, failed, canceled |
| failed | scheduled, draft, canceled |
| awaiting_manual | published (user marks as done), canceled |
| canceled | draft |
| published | terminal, immutable |

**Derived values (no state of their own):**

- pending approval = draft + an open `approval_request`
- queued = scheduled ∧ `run_at ≤ now`
- needs action = unconfirmed ∪ failed ∪ blocked ∪ awaiting_manual

**`state_reason` codes** (FK to `destination_state_reasons`; the seed rows in `packages/db/schema/v1.sql`, plus migration `0009_reply_chains`, are the list):

| State | Reasons |
|---|---|
| `draft` | `approval_voided`, `unscheduled`, `rejected` |
| `retry_wait` | `transient_error`, `rate_limited`, `interrupted_safe`, `provider_processing`, `absent_verified`, `auth_refreshed`, `chain_next` |
| `verifying` | `ambiguous_response`, `interrupted_after_send`, `provider_processing`, `late_finalize` |
| `unconfirmed` | `ambiguous_response`, `interrupted_after_send`, `verify_inconclusive`, `verify_window_elapsed` |
| `failed` | `permanent_error`, `attempts_exhausted`, `late_window_exceeded`, `media_processing_timeout`, `rate_limit_beyond_deadline`, `async_give_up`, `thread_incomplete` |
| `blocked` | `account_needs_reauth`, `account_disconnected`, `account_disabled`, `app_credentials_invalid`, `policy_denied`, `entitlement_exceeded`, `refresh_token_lost`, `restore_quarantine`, `account_out_of_scope` |
| `canceled` | `user_canceled`, `workspace_deleted`, `account_purged`, `skipped_manual` |

## Steps

**Lock order:** every transaction that changes a destination's state (schedule, unschedule, cancel, claim, write-ahead, finalize, reaper, sweeps) locks the post `FOR NO KEY UPDATE` (or `FOR UPDATE`, as `trg_revision_provenance` does) **before** it locks or updates the destination. `trg_publish_summary` then re-locks a row the transaction already holds. A writer that updates the destination first can deadlock (`40P01`) with one that holds the post.

1. **Schedule:** in **one transaction**, freeze the revision, run `authorize()`, then call `graphile_worker.add_job('publish', {workspaceId, id}, run_at, job_key='dest:<id>', job_key_mode='replace', max_attempts=1)`. If the enqueue fails, the request fails; there is no silent success.
2. **Claim (CAS):**
   - `UPDATE … SET state='publishing', lease_until=now()+120s, claimed_attempt_id=$a WHERE id=$1 AND state IN ('scheduled','retry_wait') AND version=$2 AND run_at<=now()`.
   - The job payload is `{workspaceId, id}` (ADR-0046). The claim runs in `withTenant(workspaceId)` as the `system` database actor.
   - `ux_dest_inflight` allows one in-flight destination per account. A `23505` on it means the account is busy:
     - the claim transaction rolls back and the destination stays `scheduled`;
     - a separate transaction re-enqueues the job with the same `job_key` 15–30 s later (crypto jitter). `replace` retires the running job without a queue retry and inserts the new one;
     - the busy check does not count as an attempt;
     - if the re-enqueue is lost, the due sweep picks the destination up.
   - Zero rows → no-op, so duplicate or stale jobs are harmless.
   - A heartbeat renews the lease every 30 s.
   - The claim re-runs `authorize()` as the principal that scheduled, never as `system` (which `authorize()` always denies):
     - a trigger records that principal in `scheduled_by_user_id` / `scheduled_by_grant_id` from `app.actor` each time a user or grant schedules or reschedules, and clears it on unschedule;
     - the claim rebuilds it from the current membership or grant and calls `authorize(principal, 'posts:schedule', …)`. The `approval` input is `approved` when the destination is bound to an approved request; otherwise it comes from the current policy (brand override, then workspace): `exempt` or `missing`;
     - any decision other than allow is `blocked/policy_denied`. That covers a `deny` (a member who left, a revoked or expired grant, a missing scope) and a `require_approval` (a tightened approval policy, ADR-0042).
   - The table has no `publishing → draft`, so every pre-check runs while the row is still `scheduled` or `retry_wait`, in the claim transaction, with the post locked and then the destination locked. The first match wins:

     | Check | Outcome |
     |---|---|
     | `instance_state.publishing_paused` | no-op: the job ends and the row stays put |
     | `delivery_mode = 'reminder'` | `awaiting_manual` |
     | account `needs_reauth` / `disconnected` / `disabled` | `blocked/account_needs_reauth` / `account_disconnected` / `account_disabled` |
     | `authorize()` is not allow | `blocked/policy_denied` |
     | bound to a request (`approval_request_id` set) and the payload about to be sent, re-hashed from the frozen revision, ≠ `approval_request_destinations.content_hash` | `draft/approval_voided` |
     | `validate()` errors not in `preflight_acked_codes` | `failed/permanent_error`, `last_error_code = 'preflight_invalid'` |
     | all pass | CAS to `publishing` |
   - A claim that reaches `publishing` inserts a `publish_attempts` row and increments `attempt_count`. A re-claim after `retry_wait/provider_processing` is recorded with `counted = false` and does not increment it. A lease the reaper expired still counts, so a post that keeps crashing workers runs out of attempts.
   - On the first claim, every publish item gets a `destination_items` row (`rendered_text`, `rendered_sha256`). A `thread` item on a post type without `thread`, or past its `thread.maxItems`, and a `comment` item on a post type without `comment`, are frozen as `skipped`. Each claim sends one item: the lowest position that is not `confirmed` or `skipped` (see [Reply chains](#reply-chains)). Finalize marks it `confirmed` with its remote id, and a `sending` item becomes `failed` when the destination fails or blocks and `unconfirmed` when it ends `unconfirmed`. A later claim, and send again, reset `sending`, `unconfirmed` and `failed` items to `pending`; `skipped` stays.
3. **Write-ahead (ADR-0008):** commit `publish_attempts.public_send_at` **before** any step whose effect is `public`. One transaction fences it: it locks the post, then the destination `WHERE state = 'publishing' AND claimed_attempt_id = $me AND lease_until > now() AND cancel_requested_at IS NULL`, and sets `public_send_at` **only if that matched one row**. On zero rows no marker is written, the step is **not sent**, and the worker re-reads the destination:
   - `cancel_requested_at` set (still `publishing` with my attempt) → finalize `canceled/user_canceled` (allowed, since `public_send_at` is unset). Finalize also re-reads `cancel_requested_at`: a run that ends in `retry_wait`, `failed` or `blocked` without a `public_send_at` becomes `canceled/user_canceled` (side effects still apply);
   - still `publishing` with my attempt but the lease expired → return; the reaper finds no marker and moves it to `retry_wait/interrupted_safe`;
   - state or `claimed_attempt_id` changed → return without writing anything.

   A lease renewal that matches zero rows aborts the provider's `signal`.
4. **Call the provider** outside any DB transaction and persist `provider_state` after each step (upload → container → publish). Media reach the provider through `ctx.media`: bytes, or a signed URL for providers that fetch by URL, with the TTLs from [Media](07-media.md) (~1 h image, ~6 h video), signed afresh on every attempt.
5. **Finalize** in one transaction (post locked first, retried on `40P01`/`40001` so a recorded send is never dropped), fenced by `claimed_attempt_id = $me` (an expired lease alone does not fence it out): destination state, remote_id/url, attempt outcome, audit event, webhook event + deliveries, media GC marks. `posts.publish_summary` is not written here; `trg_publish_summary` derives it (see [Partial success](#partial-success)).
   - If the reaper already moved the row to `verifying/interrupted_after_send` and it still carries my attempt id, a `published` outcome goes straight to `published` (`resolution = 'api'`); any other outcome is only recorded on the attempt and the row stays `verifying`.
   - If another attempt has claimed the row since, the outcome is recorded on my attempt row only. Reconciliation promotes it later.

## Errors

| Error | Handling |
|---|---|
| `transient` / `rate_limited` | `retry_wait`: exponential backoff with full jitter (30 s → 30 min, crypto randomness) within `deadline_at`. With `attempt_count ≥ 6` → `failed/attempts_exhausted`. A next `run_at` past the deadline → `failed/late_window_exceeded` + notify |
| `rate_limited` with `retry_after` | `run_at = max(retry_after, backoff)`; a `retry_after` past `deadline_at` → `failed/rate_limit_beyond_deadline` |
| `pending` before `public_send_at` | `retry_wait/provider_processing`, `run_at = now + pollAfterMs`; the re-claim calls `publish()` again with the checkpointed `provider_state`. Past the manifest's `async.giveUpAfterMs` since the first attempt → `failed/async_give_up` |
| `pending` after `public_send_at` | `verifying/provider_processing` |
| `auth_expired` | refresh, then one retry |
| `auth_revoked` (confirmed) | `blocked/account_needs_reauth` + `channel.needs_reauth`. The same transaction sets `social_accounts.status = 'needs_reauth'` and opens (or bumps) a `channel_incidents` `auth_revoked` row, both only if the account is unchanged since it was read |
| `app_config` | `blocked/app_credentials_invalid`; sets `provider_apps.status = 'misconfigured'` and opens a `provider_app_incidents` row (instance-level). Never flags the account |
| `auth_*` / `app_config` after `public_send_at` | `unconfirmed/ambiguous_response` with the same side effects: the write-ahead marker means the post may be live, and `unconfirmed` makes "send again" ask for the duplicate acknowledgement, which `blocked → scheduled` would not |
| `permanent` | `failed` with a localised message ([Frontend](08-frontend.md)) |
| `duplicate` | `published` if a remoteId is known, otherwise `verifying` |
| `ambiguous` before `public_send_at` | `retry_wait/interrupted_safe` |
| `ambiguous` after `public_send_at` | `verifying` → the manifest's `verify.mode` decides `published` or `unconfirmed`. Verifiers: Mastodon reads the account's recent statuses (`list_recent_match`, read-only; matched on the uploaded media ids, else the plain text), Bluesky deterministic rkey, IG/Threads container status (`status_by_ref`). Every Mastodon send carries an `Idempotency-Key` derived from the destination and item position (kept 1 h by the server), so a re-send within the hour returns the original status instead of a duplicate |

## Lease reaper

The reaper runs every minute with a 30 s grace. An expired lease:

- **with** `public_send_at` → `verifying/interrupted_after_send`. The attempt stays open, so a late finalize can still record what the provider returned; the verifier closes it before its own attempt (`ux_attempt_open` allows one open attempt per destination).
- **without** it, the attempt is closed as `interrupted`, then:
  - `cancel_requested_at` set → `canceled/user_canceled`;
  - otherwise `retry_wait/interrupted_safe` with backoff, or `failed/attempts_exhausted` / `late_window_exceeded`.

## Verifier

Every transition into `verifying` (finalize, lease reaper) enqueues a `verify` job keyed `verify:<id>` in the same transaction. The reconciliation cron re-adds a missing one for every `verifying` row (`job_key_mode='preserve_run_at'`). While publishing is paused, the job does nothing and the sweep returns no rows; a check that returns during a pause is recorded, and the row is left as it is. A `verify` attempt opened less than the egress timeout + 30 s ago means another run is in flight, so a second run does nothing. Each run locks the post, then the destination, and:

1. **Reconciles** the claimed attempt:
   - an outcome a fenced-out finalize recorded is applied exactly as finalize would have applied it (`ok`/`duplicate` with a remote id → `published` `api`, `permanent` → `failed`, auth/app → `unconfirmed/ambiguous_response` with their side effects (`verifying → blocked` is not a transition, and the public step may have landed), `transient`/`rate_limited` → `retry_wait`); only an ambiguous outcome continues;
   - a still-open attempt is closed as `interrupted`. `claimed_attempt_id` stays, so a slow worker can still promote a `verifying` or `unconfirmed` row to `published`. A late `published` that arrives after the row moved on is logged at error with its remote id.
2. **Polls** a `provider_processing` row with `runtime.poll()` if the provider has it:
   - `published` → `published` (`api`);
   - `pending` → check again after `pollAfterMs`;
   - past the manifest's `async.giveUpAfterMs` (else `verify.windowMs`) → `unconfirmed/verify_window_elapsed`, never `failed`.
3. **Verifies** everything else by `verify.mode`. Its context refuses every `public` step and `media.signedUrl`. Each run, except under mode `none`, inserts one `publish_attempts` row with `kind='verify'` and `counted=false` (`attempt_count` is unchanged):

   | Case | Result |
   |---|---|
   | mode `none` | `unconfirmed`, keeping the verifying reason when it is a valid `unconfirmed` reason, else `ambiguous_response` |
   | `found` | `published`, `resolution='verified'`, `verified_at` |
   | `absent` with `idempotency_key` / `deterministic_id` / `status_by_ref` | `retry_wait/absent_verified` |
   | `absent` with `list_recent_match`, `inconclusive`, or an error from `verify()` (no account side effects) | check again at the backoff with jitter, capped at the window end |
   | `verify.windowMs` since `public_send_at` (or the attempt's start) elapsed | `unconfirmed/verify_window_elapsed` |
   | provider missing from the registry | `unconfirmed/verify_window_elapsed` |

The account side effect of a reconciled outcome applies only if no credential row of the account was updated since the attempt started. Transitions into `published`, `unconfirmed` and `failed` are audited.

## Token refresh (ADR-0009)

1. Acquire `account_credentials.refresh_lease_until/owner` (60 s) by CAS. The HTTP call runs outside any transaction.
2. Persist the new token with `WHERE version=$v AND owner=$me` **before first use**, with up to 5 DB write retries.
3. Waiters poll `version`.

If a crash loses a single-use token (Bluesky), the destination goes to `blocked/refresh_token_lost` and a `channel_incidents` row is created. The proactive refresh sweep runs every 5 min for tokens expiring within `warnLead`; `channel.expiring` fires when a credential won't be renewed in time (see Expiring below).

Phase 0 rules:

- **Triggers:**
  - **The `credential_refresh` cron (5 min)** sweeps in two passes, each reading the sweep function's full 1000-row window (capped at 7 days) and logging a full window at warn:
    - **Refresh pass**, lead `max(15 min, warnLeadMs of providers that can refresh)`. It handles only providers that can refresh and skips other rows.
    - **Warning pass**, only when some registered provider can't refresh, with lead `max(warnLeadMs of those providers)`. It handles only those providers' rows, without any provider call. A row whose account already has an open `auth_expiring` incident is skipped by one cheap query before the credential is decrypted.

    The refresh pass refreshes a credential when:
    - its access token expires within 15 min;
    - under `self_refresh`, its access token expires within `warnLeadMs`;
    - under `rotating` or `single_use`, its refresh token expires within `warnLeadMs`.

    Refresh kind `none`, or a runtime without `refresh()`, is never refreshed. A credential whose provider app is not `active` is skipped without a provider call and without a lease; claim blocks its destinations.

    The refresh pass refreshes every due row in its window, so rows that come back without being due can't crowd out due ones.
  - **The publish path.** An `auth_expired` before the public step refreshes inside the job, while the destination lease heartbeat still runs, then goes to `retry_wait/auth_refreshed` with `run_at = now` (the attempt limit and deadline still apply). A second `auth_expired` on the run claimed from `auth_refreshed` goes to `blocked/account_needs_reauth` as before.
- **Lease:**
  - The owner is `<workerId>:<uuid>`. The CAS takes the lease only when it is free or expired, and only at the version the caller read.
  - An expired lease that is still set means the previous holder died without persisting or releasing: a **takeover**.
  - The cron skips a credential that is already leased. The publish path waits, polling `version` every second for up to 60 s.
  - A version newer than the one the caller read means another holder already refreshed, so there is no provider call.
- **Persist:** an update `WHERE version = $v AND refresh_lease_owner = $me` bumps `version`, sets `updated_at` and clears the lease. DB errors are retried up to 5 times. If every try fails, or the fence misses, the lease is left to expire, an error is logged and the result counts as `transient`; the token in memory is never used.
- **Outcomes:**

  | Refresh result | Lease | Publish path | Cron |
  |---|---|---|---|
  | New credentials persisted, or another holder refreshed | cleared | `retry_wait/auth_refreshed` | nothing |
  | `auth_revoked` / `auth_expired` | cleared | `blocked/account_needs_reauth` + an `auth_revoked` incident | the same account side effect |
  | the same, after a takeover, under `rotating` / `single_use` | cleared | `blocked/refresh_token_lost` + a `refresh_token_lost` incident | the same account side effect |
  | `app_config` | cleared | `blocked/app_credentials_invalid` + the app side effect | the app side effect |
  | `transient` / `rate_limited` / `permanent` / `duplicate`, a wait that timed out, a missing row | cleared if held | `retry_wait/transient_error` | retried next run |
  | `ambiguous`, or a thrown error, under `rotating` / `single_use` | **kept until it expires**, so the next holder sees a takeover | `retry_wait/transient_error` | retried next run |

  A thrown error is mapped with `toProviderFailure` using effect `public` under `rotating` / `single_use` (sending the request may have used up the token) and `private` otherwise. Account side effects use the version fence at the version the refresh started from, so a credential another holder replaced is never flagged. The refresh HTTP call gets its own abort signal and is not aborted when the destination lease is lost.
- **Expiring (`auth_expiring`):** the relevant expiry is the refresh token's under `rotating` / `single_use` and the access token's otherwise. A credential is expiring when that expiry falls within:
  - `warnLeadMs`, if it can't be refreshed (refresh kind `none`, or no `refresh()`), checked by the warning pass;
  - half of `warnLeadMs`, if the refresh pass's refresh didn't renew it (`transient`, `skipped` or `app`), so one failed run doesn't warn. A `rejected` refresh already flags the account `needs_reauth` and doesn't count.

  An expiring credential opens one `auth_expiring` incident per account (`ux_incident_open`). Only a newly opened incident writes `channel.expiring` and its notification and sets `notified_at`; the insert is `ON CONFLICT DO NOTHING`, so an open one is left untouched (`occurrences` stays 1). A persisted refresh resolves the open incident in the same transaction, and a reconnect resolves it with the other credential incidents. The next expiring spell opens a new incident and warns again.

## Reply chains

The engine publishes a destination's items one at a time, in position order, one claim and one `publish` call each, with `retry_wait/chain_next` between items ([ADR-0055](../adr/0055-reply-chains-and-first-comment.md)). Every `destination_item` has its own state:

- `pending | sending | confirmed | unconfirmed | failed | skipped`
- Resume continues from the last confirmed item and never re-sends a confirmed part.
- An unconfirmed middle item stops the chain and moves the destination to `unconfirmed`.
- A later item that fails moves the destination to `failed/thread_incomplete`; it keeps the main post's link, and send again resumes from the first unconfirmed item.
- Each claim sends one item, with `publish_attempts.item_position` set and only that item marked `sending` at its write-ahead. `input.items` holds that item, `input.chain` the confirmed items before it (`{position, role, remoteId, anchor}`), and `input.state` the destination's `provider_state`. A `comment` item takes its step effects from `comment.steps`.
- A confirmed item records its `remote_id`, `remote_url`, `anchor`, `reply_to_remote_id` (the previous confirmed item's remote id; null for `main`) and the destination's `provider_state`, which is then reset to `{}`. Confirming `main` sets the destination's `remote_id`, `remote_url` and `published_at`; later items never overwrite them.
- While items are left, the destination goes to `retry_wait/chain_next` with `run_at = now` and `attempt_count = 0`, and is enqueued at once; the next claim is counted, so each item gets at most 6 sends. A `pending` item's give-up clock starts at that item's latest counted attempt. After the last item it goes to `published`. A late confirmation on an `unconfirmed` destination confirms the item and leaves the destination `unconfirmed`, since `unconfirmed → retry_wait` is not a transition.
- Once `main` is confirmed, neither the claim's late check nor `deadline_at` in retry planning (publish, verify, reaper) applies: the rest of the chain runs past the deadline.
- Any `failed` outcome on a later item, including `attempts_exhausted` and a claim-time failure such as `preflight_invalid`, marks that item `failed` and gives `failed/thread_incomplete`; the items after it stay `pending`. The `destination.failed` payload then carries `failed_item_position`. Everything else plans as for a single post.
- A destination with a `confirmed` item is live. Unschedule, and an edit that would thaw or remove it, answer 409 `destination_live`, so progress is never discarded and main is never re-sent; cancel still stops the rest of the chain. Marking it published by hand turns its open items `skipped` and keeps the main post's `published_at`.
- A cancel after the main item is live stops the chain. An item already past its public step settles first. If that item ends `unconfirmed`, the destination goes to `unconfirmed` and its later items stay `pending` until the user resolves it. Otherwise the destination ends `canceled/user_canceled`, keeps the main post's link, and its pending items become `skipped`.

## Partial success

A post's destinations settle independently; there is no "partially published" destination state. `posts.publish_summary` is derived by `trg_publish_summary` whenever a destination is inserted, deleted or changes state, or an approval request opens or closes. App writes to it are ignored. Over the non-canceled destinations, the first match wins:

| Condition | Summary |
|---|---|
| none left, at least one canceled | `canceled` |
| all `draft` (or no destinations) | `in_review` if an approval request is open, else `draft` |
| all `draft`/`scheduled` | `scheduled` |
| any `publishing`/`retry_wait`/`verifying` | `in_progress` |
| any `blocked`/`awaiting_manual`/`unconfirmed` | `needs_action` |
| any `draft`/`scheduled` beside settled ones | `in_progress` |
| all `published` | `completed_all` |
| all `failed` | `completed_failed` |
| otherwise | `completed_partial` |

The trigger locks the post row before counting, so concurrent finalizes cannot leave a stale summary; writers lock the post before the destination. `settle_seq` increments each time the summary enters a `completed_*` value from any other, and each increment emits one `post.completed` with `{published, failed, incomplete, canceled}` counts; `incomplete` is the subset of `failed` with reason `thread_incomplete`.

## Audit

The worker writes one `audit_events` row for each transition it makes into `published`, `failed`, `blocked`, `unconfirmed`, `awaiting_manual` or `canceled`: `actor_kind = 'system'`, `surface = 'worker'`, `action = 'destination.<state>'`, `correlation_id` = the attempt id (a fresh one for a claim-time block). `retry_wait`, `verifying` and the claim itself are not audited.

## Webhook events (ADR-0031)

Events are written in the transaction that makes the change. Each event writes one `webhook_events` row, plus one `webhook_deliveries` row for each enabled endpoint of the workspace whose `events` include its type. Phase 0 writes events and deliveries only: the HTTP sender, the endpoint API and `webhook.test` come with the delivery worker.

- **`payload`** is the whole envelope, `{id, type, created_at, api_version, workspace_id, data}`, so a resend is byte-identical and reuses the id:
  - `id` is the row id; `created_at` is `occurred_at`;
  - `api_version` is the dated constant in `packages/contract`.
- **`data`** carries ids, states and codes only, never post content, credentials or secrets. A provider string over its cap (`remote_id` 512, `remote_url` 2048, `code` 128 characters) is written as `null`, so one oversized value can't push the payload past its 16 KiB CHECK and roll back the transaction it rides in.
- **`dedupe_key`** is unique per change; a repeat insert is a no-op (`ON CONFLICT DO NOTHING`).

| Event | Written when | `data` | `sequence` | `dedupe_key` |
|---|---|---|---|---|
| `destination.published` / `failed` / `unconfirmed` / `blocked` / `awaiting_manual` | a worker transition into that state (with its audit row) | `destination_id`, `post_id`, `post_version`, `social_account_id`, `provider`, `state`, `reason`, `remote_id`, `remote_url`, `attempt_id`; `failed_item_position` (integer) on `failed/thread_incomplete` | destination version after the transition | `destination.<id>.<version>` |
| `post.completed` | `posts.settle_seq` advanced: checked after every worker transition and in every post route that changes destinations | `post_id`, `summary`, `published`, `failed`, `incomplete`, `canceled` counts | `settle_seq` | `post.completed.<postId>.<settle_seq>` |
| `channel.needs_reauth` | `flagAccount` flips the account to `needs_reauth` | `social_account_id`, `provider`, `reason` | — | `channel.needs_reauth.<accountId>.<status_changed_at>` |
| `channel.expiring` | the credential refresh cron opens an `auth_expiring` incident (see Token refresh) | `social_account_id`, `provider`, `expires_at` (RFC 3339 UTC) | — | `channel.expiring.<accountId>.<incident id>` |
| `channel.reconnected` | the OAuth connect callback (ADR-0053) sets a `needs_reauth` account back to `active` | `social_account_id`, `provider` | — | `channel.reconnected.<accountId>.<status_changed_at>` |
| `provider_app.misconfigured` | `flagApp` flips the app to `misconfigured`; written in the workspace whose job flipped it (apps are instance-wide) | `provider_app_id`, `provider`, `code` | — | `provider_app.misconfigured.<appId>.<incident id>` |
| `post.approval_requested` | `posts.request_approval` opens a request | `post_id`, `approval_request_id` (public ids) | — | `post.approval_requested.<requestId>` |
| `post.approved` / `post.rejected` | `approvals.decide` closes the request as `approved` (enough qualifying approvals) or `rejected` (`reject` or `request_changes`) | `post_id`, `approval_request_id` (public ids) | — | `post.approved.<requestId>` / `post.rejected.<requestId>` |

**In-app notifications** are written in the same transaction as the event, with its `dedupe_key` (`ON CONFLICT DO NOTHING` per user): `destination.failed` / `unconfirmed` / `awaiting_manual` go to the post's creator (while still a member) and every `owner`/`admin` with `resource_scope = 'workspace'`; `channel.needs_reauth` and `channel.expiring` go to those owners and admins only, with `incident_id` set. `post.approval_requested` goes to every member with `can_approve`, leaving out the requesting user unless the effective policy allows self-approval; `post.approved` and `post.rejected` go to the requesting user only (nobody when an API key asked). Their payload names the request's first channel, so the scope filter on list and email applies to it. `published` and `blocked` don't notify, and grants never receive notifications.

**Notification email** (only when SMTP is configured): every minute, unless publishing is paused, the job pages through `sweep_workspaces` and, inside each workspace's tenant, selects notifications from the last day with `emailed_at IS NULL`, oldest first, at most 100 per run across all workspaces and 25 per workspace. A dedicated cross-tenant sweep would need an ADR-0056 update. Each row is claimed by setting `emailed_at` and committing before the send, so delivery is **at most once**: a crash between the claim and the send loses that email and never duplicates it. A transient SMTP failure clears `emailed_at` and sets `email_retry_at` with exponential backoff (1, 2, 4 … minutes, capped at 60), so a later run retries until the row is a day old; after 8 attempts the row stays claimed. A permanent rejection keeps it set. A recipient who left the workspace or was erased is skipped and the row stays claimed. So is a row whose kind belongs to an email group the recipient muted in that workspace (`memberships.email_muted`: `failures`, `approvals` or `channels`); it still shows in-app, and kinds outside the three groups are always emailed.

The approval events are written in the transaction that opens or decides the request. A withdrawn or voided request writes no event: `post.approval_voided` is allowed by `ck_webhook_endpoints_events` but missing from ADR-0031's frozen list, so it stays unwritten until that is settled.

## Rate limits (ADR-0022)

- One `UPDATE rate_buckets … RETURNING` does the refill and the take.
- Keys:
  - provider account id
  - `app:<provider>` (the YouTube `videos.insert` bucket of 100/day per Cloud project is shared by the whole install)
  - `instance:<host>` (Mastodon)
- No token → set `run_at = now()+wait` and exit. A worker never sleeps holding a job.

## Delivery modes (ADR-0034)

`reminder` destinations reach `awaiting_manual` at `run_at`: a notification goes out with the copy and media ready, and the user marks the post as done.

## Restore quarantine (ADR-0020)

- After a restore (`restore_epoch` bump), or when the DB and config `instance_id` differ, publishing pauses.
- Every sweep that leads to an external side effect (due, lease reaper, verifier, token refresh, webhooks, media GC) returns nothing while paused.
- `sweep_quarantine_destinations` lists past-due `scheduled` and `retry_wait` rows → `blocked/restore_quarantine`.
- `publishing` and `verifying` rows are left as they are. After release, the lease reaper and the verifier classify them by `public_send_at`, so a restore never turns an ambiguous send into a fresh one.
- Only the operator CLI releases the instance (`instance_release`). Quarantined destinations are then released per workspace, in bulk, with a preview.

## Cron jobs

| Job | Interval |
|---|---|
| due sweep (first `sweep_quarantine_destinations` → `blocked/restore_quarantine`, logged at error; then `sweep_due_destinations`, re-enqueued with `job_key_mode='preserve_run_at'`, so it never pulls a busy-account retry forward) | 1 min |
| lease reaper | 1 min |
| refresh sweep | 5 min |
| tz recompute after a tzdata update (`tz_recompute`, see [Time](#time)) | 1 h |
| reconciliation: re-adds a missing `verify:<id>` job for every `verifying` row (no lower time bound); the verify job itself promotes outcomes a fenced-out finalize recorded (see [Verifier](#verifier)) | 10 min |
| async poll (IG/Threads containers, LinkedIn `PUBLISH_REQUESTED`, TikTok status) | per the manifest |
| analytics pulls | staggered |
| account capabilities refresh (`account_capabilities_refresh`: Mastodon `/api/v2/instance`, once per host, for accounts whose limits are over 24 h old; a failing server keeps the old values) | daily |
| media GC | daily |
| retention purge | daily |
| audit partition maintenance (ADR-0045) | daily |
| API version sunset alarm (`api_version_sunset`, see [Operations](11-operations.md)) | daily |
| backups | nightly |

Every run is recorded in `cron_runs`, and `worker_heartbeats` feed `/readyz`.

## Time

- Store wall time + IANA tz + derived UTC + `tzdb_version`.
- DST gap → move forward; overlap → earlier offset (`tz_resolution` recorded).
- **tzdata updates**: the wall time is the truth, the UTC instant is derived.
  - The hourly `tz_recompute` cron task walks `sweep_workspaces`. Inside `withTenant()` it re-resolves every `scheduled` destination whose `tzdb_version` differs from the running process's `process.versions.tz`.
  - It applies the same gap and overlap rules, and moves `scheduled_at`, `run_at` and `deadline_at` by the same delta. It then stamps `tz_resolution` and the new `tzdb_version`, and re-enqueues the publish job at the new instant.
  - Rows that are already sending or verifying are never touched. The approval stays valid, because it binds the wall time and zone (ADR-0011).
- The UI always shows the resolved instant and zone.
- Recurring = RRULE + tz, expanded from **local wall time** (never +7×24 h); only the next occurrence is materialised.
