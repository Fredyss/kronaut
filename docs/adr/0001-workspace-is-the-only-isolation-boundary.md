# ADR-0001: Workspace is the only isolation boundary

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Tenancy & data
- **Spec:** [Data model](../architecture/04-data-model.md)

## Context

RLS stays one predicate; agencies map 1 client : 1 workspace; export/offboarding per client.

## Decision

**Workspace = client = the only isolation boundary.** `organizations` sit above workspaces for billing/entitlements; owner mode = 1 org, 1 workspace

## Options considered

- **Chosen:** the decision above.
- Rejected: brand-as-tenant
- Rejected: flat workspaces

## Consequences

- Revisit when: most users need one social account shared across workspaces
