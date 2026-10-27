# ADR-0016: Client review links

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Content & approval
- **Spec:** [Security](../architecture/06-security.md)

## Context

A link never grows silently; a forwarded link cannot decide.

## Decision

**Review links**: explicit `review_link_posts` set; `kro_rvw_` token exchanged for a `__Host-` cookie; deciding needs `can_decide` + a 6-digit OTP to the invitee; 5 bad OTPs → lock; ≤ 90 days; revocable

## Options considered

- **Chosen:** the decision above.
- Rejected: date-range/campaign-scoped links
- Rejected: unverified link approval

## Consequences

- Revisit when: OTP friction proven too high → add "unverified" approval flagged as weaker evidence
