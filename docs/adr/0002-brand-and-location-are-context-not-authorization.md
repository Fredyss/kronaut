# ADR-0002: Brand and location are context, not authorization

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Tenancy & data
- **Spec:** [Data model](../architecture/04-data-model.md), [Security](../architecture/06-security.md)

## Context

Avoids a two-key auth model and the classic cross-client leak.

## Decision

**Brand and location are content context + resource filters, never an authorization key**

## Options considered

- **Chosen:** the decision above.
- Rejected: brand-level RLS
- Rejected: per-brand roles in v1

## Consequences

- Revisit when: No known trigger.
