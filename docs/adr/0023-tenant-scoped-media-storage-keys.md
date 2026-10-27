# ADR-0023: Tenant-scoped media storage keys

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Tenancy & data
- **Spec:** [Media](../architecture/07-media.md)

## Context

No cross-tenant existence oracle; stable approval hashes.

## Decision

Media `storage_key = sha256(workspace_id ‖ master_sha256)`; the master is immutable once ready

## Options considered

- **Chosen:** the decision above.
- Rejected: global content addressing

## Consequences

- Revisit when: No known trigger.
