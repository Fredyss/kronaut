# ADR-0027: Frozen scope vocabulary

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md)

## Context

No key or agent can ever approve or widen itself.

## Decision

**Scope vocabulary (frozen)**. Grantable, 15: `brands|channels|groups|posts|media|analytics|comments|audit:read`, `posts:draft|submit|schedule|cancel`, `media:write`, `comments:write`, `ai:generate`. **Never grantable** (DB CHECK allowlist): `approvals:decide`, `channels:connect`, `review_links:create`, `grants:manage`, `members:manage`, `policy:write`, `webhooks:manage`, `settings:write`, `billing:manage`. `posts:schedule` moves only approved/exempt versions

## Options considered

- **Chosen:** the decision above.
- Rejected: `posts:write`, `publish:request`

## Consequences

- Revisit when: No known trigger.
