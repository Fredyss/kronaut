# Architecture hardening review

**Date:** 2026-10-21  
**Scope:** `docs/architecture/`, `docs/adr/`, `docs/reference/`, and `packages/db/schema/v1.sql`  
**Method:** independent security, reliability, performance, schema-alignment, and completeness reviews followed by source-level validation

## Executive assessment

Kronaut has strong foundations: tenant-scoped rows use composite keys and row-level security, publishing treats ambiguous public effects conservatively, provider code is isolated from the database, outbound traffic has one SSRF-aware boundary, and machine principals cannot approve or connect channels.

Implementation should not begin against the current schema without resolving the Phase 0 blockers below. The most important issue is not an optimization: the application role currently receives full access to every global table while row-level security applies only to tenant tables. Several documented cross-tenant jobs also have no permitted database entry point.

This review does not alter an accepted ADR. Findings that change one-way decisions require new ADRs; accepted ADRs remain immutable.

## Phase 0 blockers

### AR-01 — Global tables bypass tenant isolation

**Severity:** Critical

`packages/db/schema/v1.sql` grants `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on every table to `kronaut_app`, then enables row-level security only when a table has `workspace_id`. Global tables include `users`, `sessions`, `security_events`, `provider_apps`, `instance_state`, `usage_counters`, and `entitlement_overrides`.

An application bug or SQL injection could expose all users and sessions, alter instance security state, change entitlements, or release a restore quarantine.

**Required action:** add an ADR extending ADR-0003 with a least-privilege model for global identity and instance tables. Revoke blanket access, expose narrowly scoped operations through allowlisted functions or views, and separate instance-operator actions from tenant application actions.

**Acceptance:** a database test proves that `kronaut_app` cannot directly read or mutate each protected global table.

### AR-02 — Cross-tenant jobs have no complete database boundary

**Severity:** High

ADR-0003 requires cross-tenant work to use `SECURITY DEFINER` sweeps that return IDs only. The schema provides only grant lookup, review-link lookup, user-workspace lookup, due-destination sweep, and expired-lease sweep functions. Verification, token refresh, webhook delivery, retention, media GC, quarantine, analytics, and SLO jobs have no cross-tenant entry point.

These jobs can silently see no rows under row-level security or force future code to bypass the declared database boundary.

**Required action:** define one bounded, allowlisted sweep per cross-tenant task. Every sweep must return IDs only, cap its batch size, use deterministic ordering, and hand each result to `withTenant()`.

**Acceptance:** each scheduled task is tested as `kronaut_app` across at least two workspaces.

### AR-03 — Restore quarantine is not guaranteed

**Severity:** High

ADR-0020 relies on a `restore_epoch` bump or an `instance_id` mismatch. A hosted point-in-time restore can preserve the configured instance ID and does not execute the import CLI. The expired-lease sweep does not check `instance_state.publishing_paused`.

Restored in-flight work can be reclassified or resent before a human reviews it, violating the zero-duplicate objective.

**Required action:** define restore detection independent of restored database contents, make every publishing and reaper entry point honor the pause, and define which non-terminal states enter quarantine.

**Acceptance:** `restore_without_cli_bump` proves that no provider call or recovery transition occurs before human release.

### AR-04 — OAuth connection security is unspecified

**Severity:** High

The stack names OAuth and PKCE libraries but does not bind callback state to a session, workspace, provider app, issuer, redirect target, and PKCE verifier. Callback replay, issuer mix-up, and per-instance Mastodon registration are not specified.

**Required action:** add an OAuth connect-flow ADR defining single-use state, expiry, callback binding, issuer validation, redirect allowlists, and replay handling.

**Acceptance:** add `OAUTH-01 state_and_pkce_binding`, `OAUTH-02 issuer_mixup`, and `OAUTH-03 callback_replay`.

### AR-05 — Bluesky key storage and discovery egress are missing

**Severity:** High

ADR-0035 requires `private_key_jwt`, DPoP, PAR, and rotating keys. ADR-0021 and the schema model symmetric client secrets only. Bluesky handle, DID, PDS, and authorization-server discovery are not listed among user-influenced SSRF paths.

**Required action:** define encrypted asymmetric-key storage, key IDs, rotation overlap, DPoP key lifecycle, and allowlisted discovery redirects. Extend the secret-canary and SSRF suites.

## Phase 1 blockers

### AR-06 — Retry and recovery writes do not guarantee a wake-up job

**Severity:** High

The pipeline says a rate-limited worker updates `run_at` and exits, and the lease reaper moves safe work to `retry_wait`. It does not require either transaction to enqueue or replace the destination job. Reconciliation runs every ten minutes.

**Required action:** every transition to `scheduled` or `retry_wait`, and every `run_at` change, must enqueue the destination in the same transaction. Validate the pinned graphile-worker `job_key` behavior for a locked or crashed job.

**Acceptance:** fault tests prove prompt wake-up after rate limiting, lease expiry, and process crash.

### AR-07 — Graceful shutdown is undefined

**Severity:** High

No document defines SIGTERM behavior, claim draining, or a container grace period. Deployments can turn safe work into delayed retries and public sends into `unconfirmed`.

**Required action:** stop claiming on SIGTERM, preserve the write-ahead rule, finish or fence the current provider step, and set a measured shutdown grace period.

**Acceptance:** add `sigterm_before_public_step` and `sigterm_after_public_send`.

### AR-08 — Rate-bucket keys contradict the schema

**Severity:** High

The schema permits only `app:`, `account:`, and `endpoint:` keys. The architecture also requires `instance:` provider keys and per-grant and per-IP API buckets.

**Required action:** supersede or extend ADR-0022 with the complete key vocabulary, ownership, retention, pruning, jitter, and accounting rules for publish, poll, verify, and refresh calls.

**Acceptance:** schema constraints and tests enumerate the same key vocabulary.

### AR-09 — Audit and privacy lifecycle rules conflict

**Severity:** High

Audit rows are insert-only and the app role cannot update or delete them, while operations require IP and user-agent data to be nulled after 90 days, audit events purged after 400 days, and workspace deletion to remove audit rows. Reviewer-email erasure is not defined.

**Required action:** specify a privileged, auditable retention path that cannot rewrite sealed event content, and define reviewer-PII erasure.

**Acceptance:** retention tests execute with production-equivalent roles and verify seal integrity.

### AR-10 — Capacity, fairness, and operational limits are unmeasured

**Severity:** Medium

There is no design load, worker concurrency, database-pool budget, provider concurrency enforcement, statement timeout, media concurrency limit, disk threshold, or queue-fairness policy. Most resource and SLO values are assumptions.

**Required action:** define a reference workload and derive per-role concurrency, pool size, queue fairness, media limits, and timeouts from measurements.

**Acceptance:** Phase 1 gates include the existing one-million-row RLS benchmark plus burst, same-account contention, pool-exhaustion, full-disk, and backup/restore timing tests.

## Phase 2 blockers

### AR-11 — MCP transport and authentication are unspecified

**Severity:** High

ADR-0030 freezes tool names but does not define transport, bearer-token presentation, Host and Origin validation, request and response limits, cancellation, timeouts, pagination, or the action and scope mapped to each tool. OAuth/DCR is deferred to Phase 3.

**Required action:** add an MCP transport ADR before Phase 2. It must define the Phase 2 authentication mechanism, strict Host and Origin policy, route-registry generation, per-tool scope/action mapping, idempotency, pagination, size and time limits, cancellation, audit fields, and the complete untrusted-text envelope policy.

**Acceptance:** snapshot the tool-to-action-to-scope matrix and test Origin/Host rejection, output limits, cancellation, idempotency, secret canaries, and cross-tenant access.

### AR-12 — Public ingress is not modelled

**Severity:** High

Provider callbacks, Meta data deletion, and Bluesky client metadata require unauthenticated ingress, but the security architecture only specifies billing-webhook verification. The media chapter says Cloudflare Access bypass is limited to the media hostname and never to an app path.

**Required action:** define the public ingress hostnames and exact route allowlist, verification scheme, replay store, body limit, rate limit, logging policy, and account-to-workspace resolver for each source.

**Acceptance:** the committed public-route snapshot and inbound-webhook suite enumerate every unauthenticated endpoint.

### AR-13 — Provider persistence and error redaction need a contract

**Severity:** Medium

Providers may persist arbitrary `provider_state` JSON, and raw provider error text can be stored for technical details. The provider contract does not explicitly forbid credentials or sensitive response bodies in those fields.

**Required action:** restrict provider state to a schema-owned allowlist, cap it, forbid secrets and raw bodies, and apply redaction before persistence. Enforce the database boundary with package-import tests.

**Acceptance:** the secret-canary test scans persisted JSON, attempt errors, webhook delivery errors, logs, exports, API, and MCP output.

## Confirmed consistency defects

These defects require either a superseding ADR or alignment to the higher-priority source:

- ADR-0030 omits an idempotency key for `cancel_scheduled_post`, while ADR-0040 requires one for every mutating write.
- ADR-0027 permits grants to schedule approved or exempt versions, while `trg_dest_guard` requires an approval request.
- ADR-0031 omits `post.approval_voided`, while the normative schema permits that frozen webhook event.
- ADR-0027 and `docs/architecture/06-security.md` use abbreviated read-scope names, while the schema stores names such as `brands:read`.
- The schema's rate-bucket key constraint excludes keys required by the architecture.
- The architecture claims database enforcement for some approval and cancellation rules that are not enforced by the current schema.
- Server-side AI output can be saved under a human actor without a documented path that preserves mandatory agent-content approval.
- The reliability matrix leaves many expected results undefined, and the roadmap does not map architecture tests to phase exit criteria.

## Missing architecture chapters

Before Phase 1 is complete, add:

1. **API contract:** pagination, filtering, errors, concurrency control, request limits, idempotency behavior, compatibility, deprecation, and generated-client guarantees.
2. **Deployment and upgrade:** configuration lifecycle, migration order, rollback limits, graceful shutdown, restore detection, key rotation, and version skew.
3. **Accessibility:** target standard, keyboard and focus behavior, reduced motion, contrast, screen-reader expectations, and automated/manual acceptance tests.

## Recommended PR sequence

1. Global-table privileges and bounded cross-tenant job ADR, schema changes, and role-level tests.
2. Restore detection, pause enforcement, retry wake-ups, and graceful shutdown contract.
3. OAuth connect flow, public ingress, and Bluesky asymmetric-key lifecycle.
4. Rate-bucket vocabulary, capacity model, queue fairness, and observability.
5. Audit/privacy lifecycle and retention-role tests.
6. MCP transport/authentication and tool authorization matrix before MCP implementation.
7. API, deployment, and accessibility chapters plus measurable roadmap exit criteria.

Each PR should update the relevant architecture chapter, test catalogue, roadmap gate, and normative schema together. Provider facts must still be re-verified against official documentation immediately before implementing each provider.
