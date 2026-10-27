# ADR-0029: Single authorization function

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md)

## Context

One engine, no bypass path.

## Decision

**Pure `authorize(principal, action, resource, inputs) → allow | deny{code} | require_approval`**, precedence deny > require_approval > allow. Called by `defineRoute`, every MCP tool and the worker claim (deny → `blocked`). Every decision is audited with `policy_version`

## Options considered

- **Chosen:** the decision above.
- Rejected: per-route checks

## Consequences

- Revisit when: No known trigger.
