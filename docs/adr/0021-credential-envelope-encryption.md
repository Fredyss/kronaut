# ADR-0021: Credential envelope encryption

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md)

## Context

Rotatable without re-encrypting payloads.

## Decision

**Credentials**: per-row DEK, AES-256-GCM, wrapped by `KRONAUT_KEK_<v>`. AAD = `aad_v|credential_id|workspace_id|provider`. Rotation re-wraps DEKs only

## Options considered

- **Chosen:** the decision above.
- Rejected: a single key
- Rejected: no AAD

## Consequences

- Revisit when: No known trigger.
