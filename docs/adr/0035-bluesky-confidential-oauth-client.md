# ADR-0035: Bluesky confidential OAuth client

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Providers & product
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Media](../architecture/07-media.md)

## Context

A public client's session dies at 2 weeks, so unattended scheduling is impossible without it.

## Decision

**Bluesky uses a confidential OAuth client** (`private_key_jwt`, DPoP, PAR, public client-metadata URL). Every install therefore needs a **public HTTPS hostname**, which it already needs for IG media fetches and OAuth callbacks (cloudflared). No app-password path in v1

## Options considered

- **Chosen:** the decision above.
- Rejected: public client
- Rejected: app passwords

## Consequences

- Revisit when: self-hosters without a public hostname ask for it
