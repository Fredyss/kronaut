# ADR-0033: Post and variant model

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Content & approval
- **Spec:** [Data model](../architecture/04-data-model.md), [Frontend](../architecture/08-frontend.md)

## Context

Thread overrides stay simple (no item-level merge); the publish input is immutable.

## Decision

**Post = default variant + optional per-destination variants.** A variant owns its whole ordered item list (post / reply / first_comment). The canonical item is ProseMirror JSON; HTML is never stored. The worker publishes from a frozen revision snapshot, never from live rows

## Options considered

- **Chosen:** the decision above.
- Rejected: sparse field-level overrides

## Consequences

- Revisit when: No known trigger.
