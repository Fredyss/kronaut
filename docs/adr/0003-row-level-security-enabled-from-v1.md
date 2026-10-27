# ADR-0003: Row-level security enabled from v1

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Tenancy & data
- **Spec:** [Data model](../architecture/04-data-model.md), [Security](../architecture/06-security.md)

## Context

One missing `WHERE` is not a breach; pooled-connection leaks are impossible.

## Decision

**RLS `ENABLE` (not `FORCE`) from v1**. The app runs as a non-owner role. `withTenant()` sets context with `set_config(…, true)` only. An unset tenant raises. Cross-tenant sweeps go through `SECURITY DEFINER` functions that return ids only

## Options considered

- **Chosen:** the decision above.
- Rejected: app-only checks
- Rejected: FORCE RLS in Phase 3

## Consequences

- Revisit when: policy predicates cost > 20% p95 (benchmark at 1M rows before Phase 1 release)
