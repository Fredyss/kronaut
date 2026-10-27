# ADR-0040: Idempotency keys for every write

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md)

## Context

Retries from agents, flaky networks and double clicks are safe.

## Decision

**Idempotency keys for every mutating write**, UI included: `idempotency_keys(workspace_id, actor_key, key)`, retained 24 h (7 d for MCP); same key + different body → 409

## Options considered

- **Chosen:** the decision above.
- Rejected: REST-only idempotency

## Consequences

- Revisit when: No known trigger.
