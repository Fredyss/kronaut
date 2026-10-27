# ADR-0005: UUIDv7 internally, prefixed ids at the API

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Tenancy & data
- **Spec:** [Data model](../architecture/04-data-model.md)

## Context

Time-ordered keys; typed public ids.

## Decision

uuidv7 internally, TypeID-style prefixed ids at the API

## Options considered

- **Chosen:** the decision above.
- Rejected: serial
- Rejected: uuidv4

## Consequences

- Revisit when: PG 18 → use the native `uuidv7()`
