# ADR-0048: Least-privilege global tables and bounded cross-tenant entry points (revised)

- **Status:** Accepted
- **Date:** 2026-10-22
- **Deciders:** Frederik Schlentc
- **Area:** Tenancy & data
- **Spec:** [Data model](../architecture/04-data-model.md), [Security](../architecture/06-security.md), [Publishing pipeline](../architecture/05-publishing-pipeline.md), [Operations](../architecture/11-operations.md)

## Context

ADR-0003 isolates tables that carry `workspace_id`. The v1 schema still granted full DML on every other table to `kronaut_app`, so one injection could read every user and session, rewrite entitlements or release a restore quarantine. Most cross-tenant jobs (verification, token refresh, webhooks, media GC, quarantine, retention, SLO) also had no database entry point, so they would either see nothing under RLS or push code toward a privileged connection. This ADR extends ADR-0003 and refines ADR-0020 and ADR-0026.

It supersedes ADR-0044 and keeps its decision, adding three things: the audit maintenance entry point (ADR-0045), the job queue schema (ADR-0046) and client signing keys (ADR-0047). ADR-0044 left audit partition maintenance to the migration role, which nothing runs on a schedule.

## Decision

**Tenant tables keep full DML under `tenant_isolation`. Every other table is default-deny: `kronaut_app` gets only the grants listed here, and anything else crosses tenants through an allowlisted `SECURITY DEFINER` function.**

Roles:

- `kronaut_app`: the web and worker process. Workspace context comes from `withTenant()`. Before a workspace is chosen (login, account pages), `withActor()` sets only `app.actor`.
- `kronaut_operator` (new, `NOLOGIN`, granted to the CLI login): the `cli` principal of ADR-0026. It holds the instance actions and has no tenant-table privilege.

Global tables for `kronaut_app`:

| Table | Access |
|---|---|
| `workspaces` | `SELECT`, `DELETE`, `UPDATE` (name, slug, timezone, default language, deletion request) under `tenant_isolation`. Creation only through `provision_*`. |
| `organizations` | `SELECT`, `UPDATE (name)` for the current workspace's organization. |
| `entitlement_overrides` | `SELECT` for the current organization. Writes are operator-only. |
| `usage_counters` | `SELECT`, `INSERT`, `UPDATE` for the current organization. |
| `users` | `SELECT`, `UPDATE` (profile, credential and erasure columns), own row only. Creation only through `auth_create_user`. |
| `sessions` | `SELECT`, `INSERT`, `UPDATE` (idle expiry, re-auth), `DELETE`, own rows only. |
| `security_events` | `INSERT` any, `SELECT` own. |
| `deletion_receipts` | `INSERT` only. |
| `provider_apps` | `SELECT`; `INSERT` per-instance apps only (`instance_host <> ''`); `UPDATE (status, last_verified_at)`, never to or from `disabled`. |
| `provider_app_keys` | `SELECT`. Key writes are operator-only (ADR-0047). |
| `instance_state`, `destination_transitions`, `destination_state_reasons` | `SELECT`. |
| `provider_app_incidents`, `rate_buckets`, `worker_heartbeats`, `cron_runs` | `SELECT`, `INSERT`, `UPDATE`. |
| `inbound_events` | `SELECT`, `INSERT`, `UPDATE (processed_at)`. |
| `ephemeral_kv` | Full DML. |

Organization-scoped rows use `app_organization_id()`, which resolves the organization of the current workspace under RLS. Co-member names and emails come from `workspace_member_profiles()`, because RLS on `users` cannot be per column.

`kronaut_operator` gets full DML on `provider_apps`, `provider_app_keys` and `entitlement_overrides`, `SELECT` on `organizations`, `instance_state`, `provider_app_incidents` (plus `UPDATE (resolved_at)`), `worker_heartbeats`, `cron_runs` and `deletion_receipts`, and nothing else.

Entry points (all `SECURITY DEFINER`, `search_path` pinned, `EXECUTE` revoked from `PUBLIC`, granted per role):

| Function | Role | Purpose |
|---|---|---|
| `auth_lookup_grant_token`, `auth_lookup_review_link`, `auth_lookup_session` | app | Resolve an unguessable token hash to the minimum identity. |
| `auth_login_lookup`, `auth_create_user`, `auth_user_workspaces` | app | Login, sign-up, workspace picker. |
| `workspace_member_profiles` | app | Names and emails of the current workspace's members. |
| `provision_organization`, `provision_workspace` | app | Create an organization or workspace with the acting user as owner and approver. A live `user` actor is required; `provision_workspace` also requires an owner in that organization. |
| `instance_fence` | app | Adopt the instance id on first boot. On a mismatch, pause with `instance_id_mismatch`. It can only pause. |
| `instance_pause`, `instance_mark_restored`, `instance_release` | operator | Pause, quarantine after a restore (bumps `restore_epoch`), release and adopt an instance id. |
| `sweep_due_destinations`, `sweep_expired_leases`, `sweep_verifying_destinations` | app | Publishing pipeline. |
| `sweep_quarantine_destinations` | app | Past-due `scheduled` and `retry_wait` rows while paused for `restore_quarantine` or `instance_id_mismatch`, to be moved to `blocked/restore_quarantine`. |
| `sweep_expiring_credentials` | app | Credentials expiring within the window (capped at 7 days) whose refresh lease is free and whose account is active. |
| `sweep_due_webhook_deliveries` | app | Pending and retry-wait deliveries that are due. |
| `sweep_media_gc` | app | GC candidates: deleted over 30 days ago and not purged, uploads stuck for 7 days, expired renditions. The job re-checks references inside `withTenant()`. |
| `sweep_workspaces` | app | Keyset-paged workspace ids for jobs that touch only this database (retention, deletion grace). |
| `purge_instance_retention` | app | Bounded retention deletes on global tables. |
| `maintain_audit_partitions` | app | Create audit partitions ahead, drop expired ones and null audit PII (ADR-0045). |
| `slo_publish_stats` | app, operator | Instance-wide aggregates, never ids, for a window of at most 31 days. |

Rules for every sweep:

- Return `(workspace_id, id)` and nothing else. The caller re-reads the row inside `withTenant()`.
- Cap the batch at 1000 and order deterministically, ending with `workspace_id, id`.
- Return nothing while publishing is paused if the work leads to an external side effect. `sweep_workspaces` is exempt because it drives database-local jobs only.
- A job that is enqueued with `(workspace_id, id)` in its payload needs no sweep.

Quarantine never touches `publishing` or `verifying` rows. They stay where they are, and after release the lease reaper and the verifier classify them by `public_send_at`, so a restore cannot turn an ambiguous send into a fresh one. Releasing quarantined destinations is a per-workspace action in the app. Releasing the instance is operator-only.

The `graphile_worker` schema is installed by the migration role, and `kronaut_app` gets DML and `EXECUTE` inside it but no DDL (ADR-0046).

New global tables and new definer functions are unreachable until this ADR, or one that supersedes it, lists them. The database tests TEN-04 to TEN-07 compare the live catalog with these lists exactly.

Out of scope:

- Restore detection that does not depend on restored contents, and a trigger that blocks a claim while paused (the rest of AR-03).
- Billing writes (ADR-0019 follow-up).
- SaaS invites (Phase 3).
- Analytics sweeps, which ship with the Phase 2 tables.

## Options considered

- **Chosen:** the decision above.
- Rejected: views with `security_barrier` over global tables. They still need table grants or an owner bypass, and they do not separate the operator from the app.
- Rejected: a second privileged connection for workers. One leaked pool would bypass RLS for every tenant, which is exactly what ADR-0003 exists to prevent.
- Rejected: `FORCE ROW LEVEL SECURITY` with a `BYPASSRLS` worker role. Same blast radius as a privileged connection.
- Rejected: per-row RLS only, with no column grants. It cannot stop the app from rewriting `organizations.plan` or `provider_apps` secrets on rows it may read.

## Consequences

- An injection in the app can no longer list users, sessions or other organizations, write entitlements, register instance-wide provider apps or lift a pause.
- Every new cross-tenant job needs a new function and an ADR row. That friction is intended.
- Login, sign-up and the workspace picker depend on definer functions, so their signatures are part of the database contract.
- The CLI needs its own login role that is granted `kronaut_operator`.
- Revisit when: a job needs more than ids from another tenant, or the 1000-row cap becomes a throughput limit.
