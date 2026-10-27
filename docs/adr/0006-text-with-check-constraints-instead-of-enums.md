# ADR-0006: Text with CHECK constraints instead of enums

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Tenancy & data
- **Spec:** [Data model](../architecture/04-data-model.md)

## Context

New values = additive migration, no enum rewrite.

## Decision

**Text + named CHECK instead of pg enums**; state transitions and reason codes are **rows** (`destination_transitions`, `destination_state_reasons`)

## Options considered

- **Chosen:** the decision above.
- Rejected: pg enums

## Consequences

- Revisit when: No known trigger.
