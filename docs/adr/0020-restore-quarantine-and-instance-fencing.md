# ADR-0020: Restore quarantine and instance fencing

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Publishing pipeline
- **Spec:** [Publishing pipeline](../architecture/05-publishing-pipeline.md), [Security](../architecture/06-security.md)

## Context

A restore or clone must never cause mass duplicates.

## Decision

**Restore quarantine + `instance_id` fencing**: after a restore, past-due destinations → `blocked/restore_quarantine` until a human releases them. A DB/config `instance_id` mismatch pauses publishing

## Options considered

- **Chosen:** the decision above.
- Rejected: no restore protection

## Consequences

- Revisit when: No known trigger.
