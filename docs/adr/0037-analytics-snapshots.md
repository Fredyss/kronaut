# ADR-0037: Analytics snapshots

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Providers & product
- **Spec:** [Data model](../architecture/04-data-model.md)

## Context

Honest charts.

## Decision

Analytics: snapshots are written only when a value changes, with provenance; **missing ≠ 0** (NULL is stored, never 0)

## Options considered

- **Chosen:** the decision above.
- Rejected: dense zero-filled series

## Consequences

- Revisit when: No known trigger.
