# ADR-0004: Composite tenant keys

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Tenancy & data
- **Spec:** [Data model](../architecture/04-data-model.md)

## Context

Cross-tenant references are impossible, not merely invisible (FK checks bypass RLS).

## Decision

**Composite `(workspace_id, id)` PKs/FKs everywhere**

## Options considered

- **Chosen:** the decision above.
- Rejected: single-column FKs + triggers

## Consequences

- Revisit when: No known trigger.
