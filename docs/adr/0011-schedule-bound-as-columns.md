# ADR-0011: Schedule bound as columns

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Content & approval
- **Spec:** [Publishing pipeline](../architecture/05-publishing-pipeline.md), [Security](../architecture/06-security.md)

## Context

A tolerance is expressible; tzdata updates void nothing.

## Decision

**Schedule bound as columns, not hashed**: `shown_local` + `shown_tz` + `tolerance_min`, enforced by FK + CHECK. The tolerance is snapshotted from the policy

## Options considered

- **Chosen:** the decision above.
- Rejected: schedule inside the hash

## Consequences

- Revisit when: No known trigger.
