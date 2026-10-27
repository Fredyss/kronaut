# ADR-0042: Approval policy defaults

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Content & approval
- **Spec:** [Security](../architecture/06-security.md)

## Context

Safe defaults; the solo owner sees no friction.

## Decision

**Approval policy** `mode none|required` per workspace, brand override. `stages` column exists (always 1 in v1). Tightening applies at claim; loosening never auto-approves. **Self-approval default false**; onboarding sets it true for a single-member workspace, visible in settings, never auto-flipped when a member joins. **Reschedule tolerance default 0**

## Options considered

- **Chosen:** the decision above.
- Rejected: self-approval true for solo owners as an implicit default

## Consequences

- Revisit when: agencies report re-approval noise → raise the default (two-way: policy value)
