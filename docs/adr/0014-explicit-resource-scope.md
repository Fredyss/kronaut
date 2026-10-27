# ADR-0014: Explicit resource scope

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md)

## Context

Fail-closed.

## Decision

**`resource_scope` is explicit**: restricted + 0 `access_scopes` rows = nothing. An account is in scope if it, its location or its brand is listed, evaluated live. A post is in scope only if all its destinations are. Groups never grant access

## Options considered

- **Chosen:** the decision above.
- Rejected: "no rows = whole workspace" (breakable by deleting the last row)

## Consequences

- Revisit when: No known trigger.
