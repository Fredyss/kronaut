# ADR-0045: Audit partition maintenance in the database

- **Status:** Accepted
- **Date:** 2026-10-22
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md), [Operations](../architecture/11-operations.md)

## Context

ADR-0015 makes `audit_events` insert-only with monthly partitions. Three jobs keep it healthy: create next months' partitions, drop partitions past the 400-day retention, and null `ip_prefix`/`ua_hash` after 90 days. `kronaut_app` can do none of them (no DDL, `UPDATE` and `DELETE` revoked), and ADR-0044 left them to the migration role, which nothing runs on a schedule. A missing month routes rows to the default partition, and once it holds rows for a month that month's partition can no longer be created.

## Decision

**One allowlisted `SECURITY DEFINER` function, `maintain_audit_partitions(p_limit)`, owned by the migration role and executable by `kronaut_app`, runs daily from the app's cron and once at the end of the v1 schema.** It:

- creates the partitions for the current month and the next two (`audit_events_pYYYYMM`), skipping a month whose rows already sit in the default partition;
- drops partitions whose whole range is older than 400 days;
- nulls `ip_prefix` and `ua_hash` on rows older than 90 days, at most `p_limit` (capped at 10000) per call;
- returns `(relation, affected)` rows like `purge_instance_retention`, including the default partition's row count, which must be 0. A non-zero count is an alert.

It runs with `lock_timeout = 3s`; a blocked run fails and the next daily run retries, two months ahead of need. Nulling PII is the only `UPDATE` on audit rows and happens only here; ADR-0015 already keeps those columns out of the seal hash.

## Options considered

- **Chosen:** the decision above.
- Rejected: the migrator pre-creates about 24 months on every deploy, plus an operator cron for deletes and nulling. Self-hosters must install a host cron, and an install that never redeploys runs out of partitions.
- Rejected: pre-create far ahead and defer deletes and nulling. Breaks the 90-day PII rule.

## Consequences

- No operator step: a fresh install and a long-idle install keep their partitions.
- One more definer function on the allowlist (ADR-0048).
- Revisit when: audit volume makes a daily batch of 10000 too small, or seals (Phase 2) need partitions frozen before they are dropped.
