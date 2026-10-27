# ADR-0024: Expand, deploy, contract migrations

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Tenancy & data
- **Spec:** [Data model](../architecture/04-data-model.md)

## Context

Hosted zero-downtime from day 1.

## Decision

**Expand → deploy → contract migrations**. The migrator enforces `lock_timeout=3s`, `CREATE INDEX CONCURRENTLY`, `NOT VALID` + `VALIDATE`

## Options considered

- **Chosen:** the decision above.
- Rejected: ad-hoc migrations

## Consequences

- Revisit when: No known trigger.
