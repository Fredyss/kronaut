# ADR-0041: Phase 0 ships the full v1 schema

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Tenancy & data
- **Spec:** [Roadmap](../architecture/09-roadmap.md)

## Context

The schema is the one-way door; code is not.

## Decision

**Phase 0 ships the full v1 schema** (`docs/schema-v1.sql`), with code only for the gate paths. Unused tables stay empty

## Options considered

- **Chosen:** the decision above.
- Rejected: grow the schema per phase

## Consequences

- Revisit when: No known trigger.
