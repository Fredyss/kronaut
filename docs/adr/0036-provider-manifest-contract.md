# ADR-0036: Provider manifest contract

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Providers & product
- **Spec:** [Provider contract](../architecture/03-provider-contract.md)

## Context

The state machine, preflight and composer all read the same facts.

## Decision

**Manifest contract** adds: `availability{state, caveatKey}`, `postTypes[{delivery api|reminder|unsupported, steps[{id, effect}], asyncLimits}]`, `cost{model, perPost{usd, linkUsd, asOf, sourceUrl}}`, `auth.refresh none|self_refresh|reusable|rotating|single_use` + TTLs + `warnLead`, `verify.mode idempotency_key|deterministic_id|status_by_ref|list_recent_match|none`, `rateLimits[{scope, headerParser}]`, `apiVersion` + sunset date. Text counting strategies: `x-weighted`, `graphemes`, `utf16`, `utf8-bytes`, plus **composite limits** (Bluesky graphemes + bytes; YouTube chars + bytes) and per-instance values (Mastodon)

## Options considered

- **Chosen:** the decision above.
- Rejected: a flat limits object

## Consequences

- Revisit when: No known trigger.
