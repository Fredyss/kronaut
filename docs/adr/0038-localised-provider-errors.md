# ADR-0038: Localised provider errors

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Providers & product
- **Spec:** [Frontend](../architecture/08-frontend.md)

## Context

SK/CZ users never see raw English API errors.

## Decision

**Provider errors are localised by class code** (`auth_expired`, `media_aspect_ratio`, …) via Paraglide in en/sk/cs. Raw provider text appears only under "Technical details". CI fails if a mapped code misses a locale

## Options considered

- **Chosen:** the decision above.
- Rejected: showing provider messages

## Consequences

- Revisit when: No known trigger.
