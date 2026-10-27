# ADR-0028: Roles and the approval flag

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md)

## Context

Approver ≠ role; client approval works.

## Decision

**Roles** (code constants): owner, admin, editor, contributor, viewer, client. Approval is a separate `memberships.can_approve` flag. Approving needs a session authenticated in the last 12 h (users) or OTP (reviewers)

## Options considered

- **Chosen:** the decision above.
- Rejected: an "approver" role
- Rejected: "recent login" only

## Consequences

- Revisit when: per-brand roles needed → additive `membership_brand_roles`
