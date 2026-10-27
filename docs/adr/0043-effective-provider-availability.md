# ADR-0043: Effective provider availability

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Providers & product
- **Spec:** [Roadmap](../architecture/09-roadmap.md), [Scope and risks](../architecture/10-scope-and-risks.md)

## Context

Self-hosters see why a provider is limited instead of silent failures.

## Decision

**Effective availability = manifest ∩ install** (`provider_apps.status`, `review_state`), shown honestly in the UI. Hosted launch of LinkedIn Pages requires a **registered legal organisation** (CMA), which ties into the company decision ([Licensing](../architecture/12-licensing.md)). TikTok is **hosted-only in practice**: its audit rejects "tools for accounts you/your team manage", and photo posts need PULL_FROM_URL from a verified domain

## Options considered

- **Chosen:** the decision above.
- Rejected: claiming parity the platforms don't allow

## Consequences

- Revisit when: platform terms change
