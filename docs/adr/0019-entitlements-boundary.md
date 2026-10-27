# ADR-0019: Entitlements boundary

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md), [Licensing](../architecture/12-licensing.md)

## Context

No backfill later; MCP/CLI/import can't bypass.

## Decision

**Entitlements boundary now**: `organizations.plan`, `entitlement_overrides`, `usage_counters`. One `entitlements.check()` in the service layer at 5 points (create workspace, connect account, add member, create key, AI call), with counters taken via conditional `UPDATE … WHERE count < limit`. Self-host = unlimited. `MODE==='saas'` checks are banned elsewhere (GritQL)

## Options considered

- **Chosen:** the decision above.
- Rejected: per-route checks
- Rejected: tables later

## Consequences

- Revisit when: hosted pricing changes
