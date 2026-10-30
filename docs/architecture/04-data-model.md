# Data model

**Normative schema: `packages/db/schema/v1.sql`** (Postgres 17, ~55 tables, validated). It ships whole in Phase 0 (ADR-0041). This section is the map, not the DDL.

**Migrations after v1:** `v1.sql` is migration 1, checksummed and frozen; later changes are files in `packages/db/migrations/`, applied in order.

- `0002_notification_email`: `workspace_member_profiles()` also returns `ui_locale`; `notifications` gains `email_attempts` and `email_retry_at` for transient-failure backoff.
- `0003_notification_email_index`: the partial index `ix_notifications_unemailed` on `notifications (workspace_id, created_at) WHERE emailed_at IS NULL`.
- `0004_user_workspaces_can_approve`: `auth_user_workspaces()` also returns `can_approve`, so `/v1/me` reads it in one query.
- `0005_membership_email_muted`: `memberships` gains `email_muted text[] NOT NULL DEFAULT '{}'`, checked to hold only `failures`, `approvals` and `channels`: the notification email groups the member turned off in that workspace.
- `0006_provider_app_redirect_uri`: `provider_apps` gains `redirect_uri text NOT NULL DEFAULT ''`, the callback a per-instance app was registered with (ADR-0051); a connect reuses an instance app only when it matches the current callback.

**Conventions**

- Every tenant table is keyed `(workspace_id, id)` with composite FKs (ADR-0004).
- Ids are uuidv7, exposed through prefixed public ids (ADR-0005).
- Status columns use text + named CHECK instead of pg enums (ADR-0006).
- `version` columns are bumped by triggers.

**Tenancy (ADR-0001..ADR-0003)**

- `organizations` → `workspaces` → `brands` → `locations`.
- The workspace is the client and the only RLS boundary.
- Brand and location are context and filters, never authorization.
- RLS uses `ENABLE` with the non-owner role `kronaut_app`.
- `withTenant(ws, actor, fn)` = a Kysely transaction + `set_config(…, true)`. `app_workspace_id()` raises when the setting is unset.
- `withActor(actor, fn)` sets only `app.actor`, for login and account pages before a workspace is chosen.
- Only `TenantDb` is exported; a lint bans importing the raw db.
- Global tables (no `workspace_id`) are default-deny. `kronaut_app` gets only the grants listed in ADR-0056; users, sessions and security events are limited to the actor's own rows, and organization rows to the current workspace's organization.
- Everything that crosses tenants goes through an allowlisted `SECURITY DEFINER` function (ADR-0056): `auth_*` lookups, `provision_*`, `instance_*`, one `sweep_*` per job, `purge_instance_retention`, `maintain_audit_partitions` and `slo_publish_stats`. Sweeps return `(workspace_id, id)` only, cap the batch at 1000, order deterministically and return nothing while publishing is paused; the caller re-reads each row inside `withTenant()`.
- The CLI connects as a login role granted `kronaut_operator`, the only role that can release a paused instance or write entitlements, instance-wide provider apps and client signing keys.
- The `graphile_worker` schema belongs to the migration role, which installs and upgrades it after the Kronaut migrations; `kronaut_app` gets DML and EXECUTE there, never DDL (ADR-0046).

**Table map**

| Group | Tables |
|---|---|
| Instance | `instance_state` (restore_epoch, publishing_paused, instance_id), `worker_heartbeats`, `cron_runs` |
| Billing seam (ADR-0019) | `organizations`, `entitlement_overrides`, `usage_counters` |
| Identity | `users`, `sessions`, `security_events`, `memberships` (role + `can_approve`), `deletion_receipts` |
| Context | `brands`, `locations`, `campaigns`, `account_groups`, `account_group_members` |
| Channels | `provider_apps` (status active\|misconfigured\|disabled, review_state), `provider_app_keys` (client signing keys, ADR-0050), `provider_app_incidents`, `social_accounts`, `account_credentials` (DEK-wrapped ciphertext, refresh lease, `version`, `client_key_id` binding the session to its signing key), `channel_incidents`, `queue_slots` (weekday + local time + zone per channel) |
| Machine access (ADR-0013/14) | `access_grants`, `grant_tokens`, `access_scopes`, `idempotency_keys` |
| Content (ADR-0033) | `posts` (origin, `agent_dirty`, schedule_mode, `publish_summary`, `series_id`, soft delete), `post_series` (RRULE subset + `dtstart_local` + zone, owner, state), `evergreen_posts` (pool, owner, state) + `evergreen_runs` (one row per copy: channel, slot, copy post), `post_variants`, `variant_items`, `post_revisions` + `revision_destinations` (immutable snapshots with hashes) |
| Media (ADR-0023) | `media_assets` (immutable master, sha256, per-workspace storage key), `media_renditions`, `item_media`, `destination_media` |
| Approval | `approval_policies` (`stages` always 1 in v1), `approval_requests`, `approval_request_destinations`, `approval_decisions`, `review_links`, `review_link_posts`, `comments` |
| Publishing (ADR-0007/08) | `post_destinations`, `destination_items` (thread parts + first comment, each with its own state and `remote_id`), `publish_attempts` (write-ahead `public_send_at`), `destination_transitions`, `destination_state_reasons` |
| Rate + inbound | `rate_buckets` (logged), `inbound_events` (provider webhooks, deduped) |
| Outbound | `webhook_endpoints` (secret + `previous_secret`), `webhook_events`, `webhook_deliveries`, `notifications` |
| Audit (ADR-0015) | `audit_events` (monthly partitions, insert-only; `maintain_audit_partitions`, ADR-0045), `audit_seals` |
| Analytics (Phase 2) | `post_metric_snapshots` (per destination and metric: `value` bigint or NULL, `observed_at`, provider + API version), `account_daily_metrics` (per channel, UTC day and metric), `destination_metric_pulls` (`next_pull_at`, step, attempts), `account_metric_pulls` (`checked_on`, attempts, `retry_after`). Written only when a value changes; NULL means missing, never 0 (ADR-0037) |

**DB-enforced invariants** (triggers or constraints, each covered by a CI test):

- Legal state transitions, with `version` bumping by exactly 1.
- One `publishing` destination per account (`ux_dest_inflight`).
- Approval hash FK.
- Schedule-binding CHECK.
- `agent_content → approval_required`.
- Immutable revisions and published rows.
- Decision actor ≠ requester.
- Attempt write-ahead ordering.
- Ready media immutable.
- Audit `occurred_at` set to transaction time.

**Key indexes:**

- due work: `post_destinations(run_at) WHERE state IN ('scheduled','retry_wait')`
- lease reaper: `(lease_until) WHERE state='publishing'`
- calendar: `(workspace_id, scheduled_at)`

## Post API (Phase 0)

Phase 0 ships only what the publishing gate needs; the editor, variants, threads, lists and the approval step come in Phase 1. All routes sit under `/v1/workspaces/:workspaceId`, accept a session or a grant, and return bare JSON with public IDs (`post_…`, `dest_…`, `acct_…`, `media_…`).

| Route | Action | Notes |
|---|---|---|
| `POST /posts` | `posts:draft` | 201. One default variant from `items` (one `main` item: `doc` + media), up to 50 non-default `variants` (`[{ items }]`, validated like `items`), plus destinations. `destinations[].variant` is an index into `variants`; without one a destination uses the default. 422 `variant_unknown` at `destinations.N.variant` for an index out of range, `variant_unused` at `variants.N` for a variant no destination uses. `origin` is `ui` for a session, `api` for a grant |
| `GET /posts/:postId` | `posts:read` | The post, its default `items`, its `variants` and its destinations with their states. `variants` holds the non-default variants a destination uses, ordered by their first destination; each destination's `variant` indexes it, or is `null` for the default. Sending `items`, `variants` and `destinations` back as a `PATCH` keeps the content |
| `PATCH /posts/:postId` | `posts:draft` | Replaces the title, the default item, and the destination set with its variants. `variants` without `destinations` is 422 `variants_need_destinations`; `destinations` without `variants` puts every destination on the default. New `items` or `variants`, or new destinations on a post that had non-default variants, void an open approval request (`content_changed`); else a new destination set does (`destinations_changed`); an approved request is left alone |
| `DELETE /posts/:postId` | `posts:draft` (+ `posts:cancel` when a destination can still be canceled) | 204; soft delete (`deleted_at`). 409 `destination_live` while a destination is `publishing`, `retry_wait` or `verifying`. In the same transaction every destination the cancel route would cancel (`scheduled`, `awaiting_manual`, `blocked`, `failed` …) goes to `canceled/user_canceled`, its jobs are dequeued, and an open approval request is voided. Published content stays on the network (no provider deletes yet); the post leaves the calendar, lists and pools. Audited as `post.deleted` |
| `POST /posts/:postId/duplicate` | `posts:draft` | 201 with the new post: a draft copy (`origin = 'duplicate'`) of the content, variants, media and every destination, unscheduled, with no approvals, revisions or publish state. A deleted source is 404 |
| `POST /posts/:postId/schedule` | `posts:schedule` | `instant` (`scheduleLocal` + `scheduleTz`) or `asap`. Under a `required` policy the post's newest `approved` request must have shown every destination the content just frozen (same hash), else 403 `approval_required`; a bound schedule must keep its time zone and stay within the tolerance, else 422 `outside_approved_schedule`. 409 while a request is open. Reschedule and send-again keep a destination's binding while its request is still `approved` |
| `POST /posts/:postId/unschedule` | `posts:schedule` | `scheduled`/`retry_wait` → `draft/unscheduled`. Returning to draft, and every schedule, starts a fresh publish: `attempt_count`, `provider_state`, the claimed attempt, the last error and `destination_items` are reset |
| `POST /posts/:postId/cancel` | `posts:cancel` | Every destination that never sent goes to `canceled/user_canceled`; a `publishing` one gets `cancel_requested_at`. `unconfirmed`, `verifying` and `published` stay as they are |
| `POST /posts/:postId/approval-requests` | `posts:submit` | Freezes every draft destination (they stay `draft`, the summary becomes `in_review`) and opens a request with the effective policy's snapshot; an optional `schedule` (`scheduleLocal` + `scheduleTz`) is stored on the post and bound per destination with the policy's tolerance. 409 when there is no draft destination or a request is already open |
| `GET /posts/:postId/approval-requests` | `posts:read` | The 20 newest requests, newest first: state, requester, what each destination was shown, and the decisions. No content hashes |
| `POST /approval-requests/:requestId/decisions` | `approvals:decide` | Session only, re-authenticated within 12 h. `approve` closes the request as `approved` once the qualifying approvals reach the greater of its and the live policy's count; `reject` and `request_changes` close it as `rejected`. The requester counts only when the live policy and the snapshot both allow self-approval. 409 on a closed request or a second decision by the same user |
| `POST /approval-requests/:requestId/withdraw` | `posts:submit` | The requesting user or API key only (else 403) closes its open request as `withdrawn` (else 409) |
| `GET /approval-policy` | `posts:read` | `{workspace, brands, effective}`: the workspace row (`null` when there is none), the brand overrides, and the values that apply to a post without a brand (the strictest default when no row exists). `stages` and `allow_reviewer_links` are not exposed |
| `PUT /approval-policy` | `policy:write` | Session only. `{mode, requiredApprovals 1–5, allowSelfApproval, rescheduleToleranceMin 0–525600, expectedVersion?}` upserts the workspace row and bumps `version`; a stale `expectedVersion` is 409 `version_conflict`. Never touches existing requests or destinations. Audited as `approvals.policy_update`. There is no route to delete the workspace row |
| `PUT /approval-policy/brands/:brandId` | `policy:write` | Session only. The same body and rules for the brand's override; 404 when the brand is not in the workspace |
| `DELETE /approval-policy/brands/:brandId` | `policy:write` | Session only. 204; removes the override so the brand falls back to the workspace row. 404 when there is none |
| `GET /needs-action` | `posts:read` | The `unconfirmed`, `failed`, `blocked` and `awaiting_manual` destinations of visible, undeleted posts, newest first, with the post's excerpt and the channel. `limit` 1–200 (default 100); returns `total` and `truncated` |
| `POST /posts/:postId/destinations/:destinationId/mark-published` | `posts:schedule` | `unconfirmed`/`awaiting_manual` → `published`, `resolution = 'manual'`, `published_at = now()`. Session only: a grant can't attest that a post is live. `destination_items` stay as they are |
| `POST /posts/:postId/destinations/:destinationId/send-again` | `posts:schedule` | `failed`/`blocked`/`unconfirmed` → `scheduled`, the same body, approval, freeze and preflight as `schedule`. `unconfirmed`, or any item still `sending`/`unconfirmed`, needs `acknowledgeDuplicate: true`, else 422 `duplicate_risk`. `confirmed` items are kept and the rest go back to `pending` |
| `POST /posts/:postId/destinations/:destinationId/cancel` | `posts:cancel` | `failed`/`blocked` → `canceled/user_canceled`, `awaiting_manual` → `canceled/skipped_manual`. `unconfirmed` is 409: mark it published or send it again |
| `GET /notifications` | `posts:read` | Session only. The caller's own notifications, newest first by id, with the account's label and handle and the post's live excerpt (`null` when the post is deleted or outside the caller's scope). A scoped caller gets only rows whose channel is in scope, and `unread` counts only those. `limit` 1–100 (default 50), `unread=true` for unread only; returns `unread`, the caller's total unread count |
| `POST /notifications/read` | `posts:read` | Session only. `{ids}` (1–100) or `{upTo}` (every unread row with `id <= upTo`; uuidv7 ids order only to the millisecond, so rows from `upTo`'s millisecond may fall either side) sets `read_at` where it is null, on the caller's own rows only; other ids are ignored. Returns the new `unread` count |
| `GET /notification-preferences` | `posts:read` | Session only. The caller's own email preferences in this workspace: `{email: {failures, approvals, channels}}`, `true` meaning emailed (the default). `failures` covers `destination.failed` / `unconfirmed` / `awaiting_manual`, `approvals` covers `post.approval_requested` / `approved` / `rejected`, `channels` covers `channel.needs_reauth` / `expiring`. In-app notifications are unaffected |
| `PUT /notification-preferences` | `posts:read` | Session only, idempotent. Strict body of the same shape with all three keys; writes `email_muted` (the groups set to `false`) and `updated_at` on the caller's own membership only. Returns the new preferences |

- **Concurrency:** the server increments `posts.version` on every write. `PATCH`, `schedule`, `unschedule` and `cancel` take `expectedVersion`; a mismatch is 409 `version_conflict`. The per-destination actions take the destination's `version` as `expectedVersion` instead, with the same 409. No ETag in Phase 0.
- **Editing:** `PATCH` works only while every destination is `draft` or `canceled`; otherwise 409 `not_editable` (unschedule first). Replacing the destination set deletes the rows left out, and a kept row loses its freeze (a canceled one goes back to `draft`). Settings are stored as the manifest's schema parsed them.
  - **Variants:** `destinations` and `variants` replace together; `items` alone touches only the default variant and keeps every destination's variant. One transaction inserts the new non-default variants with their items, replaces the destination set with each row pointing at its variant (the default when it has none), then deletes the non-default variants no destination uses. Destinations are re-pointed before any variant is deleted because `ck_dest_draft_variant` is not deferrable.
- **Content:** each `doc` is canonicalised by compose (ProseMirror JSON, NFC, LF) before it is stored; an invalid doc is 422.
- **Deadline:** `deadline_at = scheduled_at + 6 h` (`asap`: now + 6 h).
- **Preflight:** scheduling runs compose `validate()` per destination. Errors are 422 `preflight_failed`; warnings block unless their codes are in `acknowledgedCodes`, which are stored in `preflight_acked_codes`.
- **Grants and approval:** a grant can never schedule without a human approval, even under policy `none` (`trg_dest_guard`, `authorize()`), so in Phase 0 only sessions schedule.
