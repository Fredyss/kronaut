# ADR-0032: ProviderError contract

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Publishing pipeline
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Publishing pipeline](../architecture/05-publishing-pipeline.md)

## Context

Duplicate risk exists only on public steps; one bad app must not mass-disconnect users.

## Decision

**ProviderError contract**: every step declares `effect none|private|public`. Kinds: `transient`, `ambiguous`, `permanent{code}`, `duplicate{remoteId?}`, `rate_limited{scope, resetAt}`, `auth_expired`, `auth_revoked`, `app_config`. `auth_revoked` is definitive only after a confirming call with fresh credentials. `app_config` never flags an account

## Options considered

- **Chosen:** the decision above.
- Rejected: a binary retryable/permanent split

## Consequences

- Revisit when: No known trigger.
