# ADR-0015: Insert-only audit log

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md)

## Context

Stops app-level tampering at near-zero cost; GDPR nulling never breaks seals.

## Decision

**Audit**: insert-only (`REVOKE UPDATE, DELETE`), `occurred_at` forced to txn time, monthly partitions, ids/codes only in `args_summary`. The `audit_seals` table exists; the seal job ships in Phase 2. PII columns (`ip_prefix`, `ua_hash`) sit outside the seal hash

## Options considered

- **Chosen:** the decision above.
- Rejected: an inline hash chain (hot row, deadlocks)

## Consequences

- Revisit when: compliance asks for tamper evidence → enable seals + export
