# ADR-0034: Delivery mode and manual reminders

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Publishing pipeline
- **Spec:** [Publishing pipeline](../architecture/05-publishing-pipeline.md)

## Context

Reuses scheduling, notifications and `published`.

## Decision

**`delivery_mode auto|reminder`** + `awaiting_manual` state for post types an API can't publish

## Options considered

- **Chosen:** the decision above.
- Rejected: a separate reminders feature

## Consequences

- Revisit when: No known trigger.
