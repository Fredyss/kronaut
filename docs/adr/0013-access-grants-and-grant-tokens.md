# ADR-0013: Access grants and grant tokens

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md)

## Context

Phase-3 OAuth agents are a token kind, not a second authz path.

## Decision

**`access_grants(kind api_key|oauth|internal_ai)` + `grant_tokens(kind key|access|refresh, family_id)`**. Format `kro_<key_id>_<secret>`, lookup by HMAC-SHA256 with a versioned pepper. Effective rights = grant scopes ∩ the sponsor's **current** role ∩ `access_scopes`, evaluated per request

## Options considered

- **Chosen:** the decision above.
- Rejected: an `api_keys` table

## Consequences

- Revisit when: Phase-2 third-party OAuth needs per-client consent beyond grants
