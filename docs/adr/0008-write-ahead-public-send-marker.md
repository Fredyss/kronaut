# ADR-0008: Write-ahead public send marker

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Publishing pipeline
- **Spec:** [Publishing pipeline](../architecture/05-publishing-pipeline.md)

## Context

Zero duplicates matters more than on-time.

## Decision

**Write-ahead `publish_attempts.public_send_at`** is committed before every public step. An ambiguous public step is **never auto-retried** (`unconfirmed → publishing` does not exist)

## Options considered

- **Chosen:** the decision above.
- Rejected: retry on timeout

## Consequences

- Revisit when: No known trigger.
