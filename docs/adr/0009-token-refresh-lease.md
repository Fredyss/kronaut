# ADR-0009: Token refresh lease

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Publishing pipeline
- **Spec:** [Publishing pipeline](../architecture/05-publishing-pipeline.md)

## Context

No pinned pooled connection; crash-visible; Bluesky refresh tokens are single-use.

## Decision

**Token refresh via lease columns + CAS + persist-before-use**, HTTP outside any transaction. Losing a single-use token → `blocked/refresh_token_lost` + incident

## Options considered

- **Chosen:** the decision above.
- Rejected: `pg_advisory_xact_lock`
- Rejected: graphile `job_key` (4 h lock on a crashed job)

## Consequences

- Revisit when: a provider refresh takes > 60 s; multi-region
