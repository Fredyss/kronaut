# ADR-0017: Phase 0 gate: Bluesky and Instagram

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Providers & product
- **Spec:** [Roadmap](../architecture/09-roadmap.md)

## Context

IG proves the hard path: OAuth + 60-day refresh, async containers, public media URL, verification. Bluesky proves single-use refresh + a confidential OAuth client.

## Decision

**Phase 0 gate = Bluesky + Instagram** (image + carousel). Fallback to Bluesky + Mastodon if Meta access is blocked for > 2 weeks

## Options considered

- **Chosen:** the decision above.
- Rejected: Bluesky + Mastodon

## Consequences

- Revisit when: Meta blocked > 2 weeks

## Notes

2026-10-21: the owner has, or can get within 2 weeks, a Meta developer app and an Instagram professional test account. The gate stands. The Mastodon fallback applies only if access is still blocked on 2026-11-04.
