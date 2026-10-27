# ADR-0007: Eleven destination states

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Publishing pipeline
- **Spec:** [Publishing pipeline](../architecture/05-publishing-pipeline.md)

## Context

One source of truth; approval lives off the destination; reasons stay extensible.

## Decision

**11 destination states**: draft, scheduled, publishing, retry_wait, verifying, published, unconfirmed, failed, blocked, awaiting_manual, canceled. 37 legal transitions are enforced by trigger. Every change bumps `version` by 1. Everything else is a `state_reason` (FK to `(state, code)`) or derived

## Options considered

- **Chosen:** the decision above.
- Rejected: a 13-state model
- Rejected: extra states `pending_approval`/`missed`/`failed_auth`/`unknown`

## Consequences

- Revisit when: a provider needs a state no reason can express
