# ADR-0022: Provider rate buckets in Postgres

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Publishing pipeline
- **Spec:** [Publishing pipeline](../architecture/05-publishing-pipeline.md)

## Context

One stateful dependency; survives restart.

## Decision

**Provider rate state in a logged PG table** (`rate_buckets`, a single refill-and-take `UPDATE … RETURNING`), keyed on the provider's account id; the YouTube upload bucket is keyed per app

## Options considered

- **Chosen:** the decision above.
- Rejected: Redis
- Rejected: unlogged tables

## Consequences

- Revisit when: > 1k publishes/min
