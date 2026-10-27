# ADR-0026: Principal types

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md)

## Context

One model for audit, approvals and policy.

## Decision

**Principals**: `user | grant | reviewer | system | cli`. The worker is `system` and only executes an existing authority. The CLI is a break-glass operator, audited as `cli`

## Options considered

- **Chosen:** the decision above.
- Rejected: `user_id` everywhere

## Consequences

- Revisit when: No known trigger.
